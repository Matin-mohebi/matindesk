"use client";
// MatinDesk — finance view: balance cards, monthly budget, category chart, transactions CRUD.
import { useMemo, useState } from "react";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Plus, Pencil, Trash2 } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatCard, SectionTitle, EmptyState, ConfirmButton } from "./bits";
import { useMatin } from "@/lib/matin/store";
import { getDict } from "@/lib/matin/i18n";
import { fmtMoney, fmtMoneyCompact, fmtDate, todayISO, hashColor } from "@/lib/matin/helpers";
import type { Transaction, TxType } from "@/lib/matin/types";
import { cn } from "@/lib/utils";

const EXP_CATS = ["exp_food", "exp_transport", "exp_shopping", "exp_bills", "exp_fun", "exp_health", "exp_other"] as const;
const INC_CATS = ["inc_salary", "inc_freelance", "inc_gift", "inc_other"] as const;

export default function FinanceView() {
  const { transactions, settings, setSettings, addTx, updateTx, deleteTx } = useMatin();
  const t = getDict(settings.locale);
  const today = todayISO();
  const mp = today.slice(0, 7);

  const [dlg, setDlg] = useState<{ open: boolean; editing: Transaction | null }>({ open: false, editing: null });
  const [type, setType] = useState<TxType>("expense");
  const [cat, setCat] = useState<string>("exp_food");

  const monthTx = useMemo(() => transactions.filter((x) => x.date.startsWith(mp)), [transactions, mp]);
  const monthIncome = monthTx.filter((x) => x.type === "income").reduce((a, x) => a + x.amount, 0);
  const monthExpense = monthTx.filter((x) => x.type === "expense").reduce((a, x) => a + x.amount, 0);
  const allBalance = transactions.reduce((a, x) => a + (x.type === "income" ? x.amount : -x.amount), 0);
  const budget = settings.monthlyBudget;
  const budgetPct = budget > 0 ? Math.min(100, Math.round((monthExpense / budget) * 100)) : 0;

  const catData = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of monthTx) {
      if (x.type !== "expense") continue;
      m.set(x.category, (m.get(x.category) ?? 0) + x.amount);
    }
    return [...m.entries()]
      .map(([c, amount]) => ({ cat: c, name: (t[c as keyof typeof t] as string) ?? c, value: amount, color: hashColor(c) }))
      .sort((a, b) => b.value - a.value);
  }, [monthTx, t]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get("amount") ?? 0);
    if (!amount || amount <= 0) return;
    const values = {
      type: type as TxType,
      amount,
      category: cat,
      note: String(fd.get("note") ?? "").trim() || undefined,
      date: String(fd.get("date") || today),
    };
    if (dlg.editing) updateTx(dlg.editing.id, values);
    else addTx(values);
    setDlg({ open: false, editing: null });
  }

  function openNew() {
    setType("expense");
    setCat("exp_food");
    setDlg({ open: true, editing: null });
  }

  const cats = type === "income" ? INC_CATS : EXP_CATS;

  return (
    <div className="grid gap-4">
      {/* stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ArrowUpCircle} label={t.monthIncome} value={fmtMoneyCompact(monthIncome, settings.locale, settings.currency)} tone="good" />
        <StatCard icon={ArrowDownCircle} label={t.monthExpense} value={fmtMoneyCompact(monthExpense, settings.locale, settings.currency)} tone={budget > 0 && budgetPct >= 100 ? "bad" : "warn"} />
        <StatCard icon={Wallet} label={t.balance} value={fmtMoneyCompact(allBalance, settings.locale, settings.currency)} />
        <StatCard
          icon={Wallet}
          label={t.budgetUsed}
          value={budget > 0 ? `${budgetPct}٪` : "—"}
          tone={budgetPct >= 100 ? "bad" : budgetPct >= 80 ? "warn" : "good"}
          sub={budget > 0 ? `${fmtMoneyCompact(budget, settings.locale, settings.currency)} ${t.monthlyBudget.toLowerCase()}` : undefined}
        />
      </div>

      {/* budget */}
      {budget > 0 && (
        <section className="rounded-xl border bg-card p-4">
          <SectionTitle extra={<span className={"num text-xs font-bold " + (budgetPct >= 100 ? "text-rose-500" : budgetPct >= 80 ? "text-amber-500" : "text-emerald-500")}>{fmtMoney(monthExpense, settings.locale, settings.currency)} / {fmtMoney(budget, settings.locale, settings.currency)}</span>}>
            {t.budgetStatus}
          </SectionTitle>
          <Progress value={budgetPct} className="h-2.5" />
          {budgetPct >= 80 && <p className="mt-2 text-[11px] font-medium text-amber-600 dark:text-amber-400">{t.overBudget}</p>}
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* category pie */}
        <section className="lg:col-span-2 rounded-xl border bg-card p-4">
          <SectionTitle>{t.byCategory}</SectionTitle>
          {catData.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">{t.noTx}</p>
          ) : (
            <>
              <div className="h-44" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={catData} dataKey="value" nameKey="name" innerRadius={44} outerRadius={68} paddingAngle={3} strokeWidth={0}>
                      {catData.map((c) => <Cell key={c.cat} fill={c.color} />)}
                    </Pie>
                    <RTooltip
                      contentStyle={{ borderRadius: 12, fontSize: 12, background: "var(--popover)", border: "1px solid var(--border)", color: "var(--popover-foreground)" }}
                      formatter={(v) => fmtMoneyCompact(Number(v), settings.locale, settings.currency)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 grid gap-1.5">
                {catData.slice(0, 5).map((c) => (
                  <li key={c.cat} className="flex items-center gap-2 text-xs">
                    <span className="size-2.5 rounded-full" style={{ background: c.color }} aria-hidden />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="num text-muted-foreground">{fmtMoneyCompact(c.value, settings.locale, settings.currency)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* transactions */}
        <section className="lg:col-span-3 rounded-xl border bg-card p-4">
          <SectionTitle extra={
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={openNew}>
              <Plus className="size-3.5" aria-hidden /> {t.newTx}
            </Button>
          }>
            {t.recentTx}
          </SectionTitle>
          {transactions.length === 0 ? (
            <EmptyState
              icon={Wallet} title={t.noTx}
              cta={<Button size="sm" onClick={openNew}><Plus className="size-4" aria-hidden />{t.newTx}</Button>}
            />
          ) : (
            <ul className="max-h-[26rem] divide-y overflow-y-auto">
              {transactions.slice(0, 30).map((x) => {
                const inc = x.type === "income";
                return (
                  <li key={x.id} className="group flex items-center gap-3 py-2.5">
                    <span className={cn("rounded-lg p-1.5", inc ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400")}>
                      {inc ? <ArrowUpCircle className="size-4" aria-hidden /> : <ArrowDownCircle className="size-4" aria-hidden />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {(t[x.category as keyof typeof t] as string) ?? x.category}
                      </div>
                      <div className="text-[10px] text-muted-foreground num">
                        {fmtDate(x.date, settings.locale)}{x.note ? ` · ${x.note}` : ""}
                      </div>
                    </div>
                    <span className={cn("num text-sm font-bold", inc ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                      {inc ? "+" : "−"}{fmtMoneyCompact(x.amount, settings.locale, settings.currency)}
                    </span>
                    <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => {
                        setType(x.type as TxType);
                        setCat(x.category);
                        setDlg({ open: true, editing: x });
                      }} aria-label={t.edit}>
                        <Pencil className="size-3" aria-hidden />
                      </Button>
                      <ConfirmButton
                        title={t.confirmDeleteTitle} body={t.confirmDeleteBody}
                        confirmLabel={t.yesDelete} cancelLabel={t.cancel}
                        onConfirm={() => deleteTx(x.id)}
                      >
                        <Button variant="ghost" size="icon" className="size-7 text-destructive" aria-label={t.delete}>
                          <Trash2 className="size-3" aria-hidden />
                        </Button>
                      </ConfirmButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* tx dialog */}
      <Dialog open={dlg.open} onOpenChange={(o) => !o && setDlg({ open: false, editing: null })}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{dlg.editing ? t.editTx : t.newTx}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-3.5">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1" role="radiogroup" aria-label={t.income + "/" + t.expense}>
              {(["expense", "income"] as const).map((ty) => (
                <button
                  key={ty} type="button" role="radio" aria-checked={type === ty}
                  onClick={() => { setType(ty); setCat(ty === "income" ? "inc_salary" : "exp_food"); }}
                  className={cn(
                    "rounded-md py-1.5 text-xs font-semibold transition-colors",
                    type === ty ? (ty === "income" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white") : "text-muted-foreground"
                  )}
                >
                  {ty === "income" ? t.income : t.expense}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="tx-amount">{t.amount}</Label>
                <Input id="tx-amount" name="amount" type="number" inputMode="decimal" min={1} step="any" required autoFocus className="num" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tx-date">{t.date}</Label>
                <Input id="tx-date" name="date" type="date" defaultValue={dlg.editing?.date ?? today} className="num" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>{t.category}</Label>
              <Select value={cat} onValueChange={setCat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cats.map((c) => (
                    <SelectItem key={c} value={c}>{t[c as keyof typeof t] as string}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tx-note">{t.note} <span className="text-muted-foreground">({t.optional})</span></Label>
              <Input id="tx-note" name="note" defaultValue={dlg.editing?.note ?? ""} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDlg({ open: false, editing: null })}>{t.cancel}</Button>
              <Button type="submit">{t.save}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* budget setter (inline, via settings) */}
      <section className="rounded-xl border bg-card p-4">
        <SectionTitle>{t.sec_prefs}</SectionTitle>
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5 w-44">
            <Label htmlFor="budget-input">{t.monthlyBudget}</Label>
            <Input
              id="budget-input" type="number" min={0} step="any" className="num"
              defaultValue={budget || undefined}
              onBlur={(e) => {
                const v = Number(e.target.value || 0);
                if (v !== budget) setSettings({ monthlyBudget: v });
              }}
            />
          </div>
          <div className="grid gap-1.5 w-32">
            <Label htmlFor="currency-input">{t.currency}</Label>
            <Select value={settings.currency} onValueChange={(v) => setSettings({ currency: v })}>
              <SelectTrigger id="currency-input"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IRT">تومان</SelectItem>
                <SelectItem value="IRR">ریال</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-[11px] text-muted-foreground">{t.save} ✓</p>
        </div>
      </section>
    </div>
  );
}
