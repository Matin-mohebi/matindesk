"use client";
// MatinDesk — dashboard: accurate server-computed stats + charts + today focus.
import { useEffect, useState } from "react";
import {
  ListTodo, CalendarClock, CircleAlert, Flame, StickyNote, Wallet,
  Plus, RefreshCw, TrendingUp,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip as RTooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { StatCard, SectionTitle, PrioBadge, EmptyState, Dot } from "./bits";
import { useMatin, api, type ViewKey } from "@/lib/matin/store";
import { getDict } from "@/lib/matin/i18n";
import {
  fmtNum, fmtDate, fmtMoneyCompact, fmtRelative, fmtTime, todayISO,
} from "@/lib/matin/helpers";

interface Stats {
  tasks: { total: number; todo: number; in_progress: number; done: number; overdue: number; dueToday: number; doneThisWeek: number; streak: number; lastCompletedAt: string | null };
  trend: { day: string; done: number }[];
  finance: { income: number; expense: number; balance: number; budget: number; budgetUsedPct: number; expenseByCategory: { category: string; amount: number }[] };
  counts: { notes: number; bookmarks: number; projects: number; upcomingEvents: number };
  generatedAt: string;
}

export default function Dashboard() {
  const { tasks, events, projects, settings, user, setView, hydrate } = useMatin();
  const refresh = hydrate;
  const t = getDict(settings.locale);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const s = await api<Stats>("/api/stats");
        if (alive) setStats(s);
      } catch { /* offline: fall back to local view below */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [tasks, events]);

  const hour = new Date().getHours();
  const greeting = hour < 5 ? t.greetingNight : hour < 12 ? t.greetingMorning : hour < 17 ? t.greetingAfternoon : hour < 21 ? t.greetingEvening : t.greetingNight;
  const today = todayISO();
  const todayTasks = tasks.filter((x) => x.status !== "done" && x.dueDate === today);
  const todayScheduled = tasks.filter((x) => x.dueDate === today);
  const todayDone = todayScheduled.filter((x) => x.status === "done").length;
  const focusPercent = todayScheduled.length > 0
    ? Math.round((todayDone / todayScheduled.length) * 100)
    : 0;
  const upcoming = [...events].filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);

  const localPending = tasks.filter((x) => x.status !== "done").length;
  const localOverdue = tasks.filter((x) => x.status !== "done" && x.dueDate && x.dueDate < today).length;
  const pending = stats ? stats.tasks.todo + stats.tasks.in_progress : localPending;
  const overdue = stats ? stats.tasks.overdue : localOverdue;

  const spentThisMonth = stats?.finance.expense ?? 0;
  const budget = stats?.finance.budget ?? settings.monthlyBudget;
  const budgetPct = budget > 0 ? Math.min(100, Math.round((spentThisMonth / budget) * 100)) : 0;

  const trendData = (stats?.trend ?? []).map((d) => ({
    ...d,
    label: fmtDate(d.day, settings.locale, { day: "numeric", month: "short" }),
  }));

  function quick(v: ViewKey) { setView(v); }

  return (
    <div className="grid gap-5">
      {/* greeting */}
      <div className="anim-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">
            {greeting}، <span className="text-primary">{user?.name?.split(" ")[0]}</span> 👋
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmtDate(today, settings.locale)} · {t.dashSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">{t.accuracyNote}</span>
          <Button variant="outline" size="icon" onClick={refresh} aria-label={t.refresh}>
            <RefreshCw className={"size-4" + (loading ? " animate-spin" : "")} aria-hidden />
          </Button>
        </div>
      </div>

      {/* Today's focus — compact progress and direct access to the task list */}
      <section className="matin-panel rounded-2xl border p-4 sm:p-5 anim-fade-up-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-primary">
              {settings.locale === "fa" ? "تمرکز امروز" : settings.locale === "ar" ? "تركيز اليوم" : "TODAY'S FOCUS"}
            </p>
            <h3 className="mt-1 text-base font-bold">
              {settings.locale === "fa" ? "قدم‌به‌قدم پیش برو" : settings.locale === "ar" ? "تقدّم خطوة بخطوة" : "Make progress, one step at a time"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {todayScheduled.length === 0
                ? (settings.locale === "fa" ? "برای امروز وظیفه‌ای زمان‌بندی نشده است." : settings.locale === "ar" ? "لا توجد مهام مجدولة لليوم." : "No tasks scheduled for today.")
                : settings.locale === "fa"
                  ? `${fmtNum(todayDone, settings.locale)} از ${fmtNum(todayScheduled.length, settings.locale)} کار امروز انجام شده است.`
                  : settings.locale === "ar"
                    ? `${fmtNum(todayDone, settings.locale)} من ${fmtNum(todayScheduled.length, settings.locale)} مهام اليوم مكتملة.`
                    : `${todayDone} of ${todayScheduled.length} tasks completed today.`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => quick("tasks")}>
            {settings.locale === "fa" ? "رفتن به کارها" : settings.locale === "ar" ? "عرض المهام" : "Open tasks"}
          </Button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Progress value={focusPercent} className="h-2.5 flex-1" />
          <span className="num min-w-10 text-end text-xs font-bold text-primary">{fmtNum(focusPercent, settings.locale)}٪</span>
        </div>
      </section>

      {/* stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 anim-fade-up-1">
        <StatCard icon={ListTodo} label={t.stat_pending} value={loading ? <Skeleton className="h-6 w-14" /> : fmtNum(pending, settings.locale)} sub={`${t.tasksTotal}: ${fmtNum(stats?.tasks.total ?? tasks.length, settings.locale)}`} />
        <StatCard icon={CalendarClock} label={t.stat_dueToday} value={loading ? <Skeleton className="h-6 w-14" /> : fmtNum(stats?.tasks.dueToday ?? todayTasks.length, settings.locale)} tone={stats?.tasks.dueToday ? "warn" : "default"} />
        <StatCard icon={CircleAlert} label={t.stat_overdue} value={loading ? <Skeleton className="h-6 w-14" /> : fmtNum(overdue, settings.locale)} tone={overdue > 0 ? "bad" : "good"} />
        <StatCard icon={Flame} label={t.streak} value={loading ? <Skeleton className="h-6 w-14" /> : <span>{fmtNum(stats?.tasks.streak ?? 0, settings.locale)} <span className="text-xs font-normal">{t.streakDays}</span></span>} sub={`${t.tasksDoneThisWeek}: ${fmtNum(stats?.tasks.doneThisWeek ?? 0, settings.locale)}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* trend */}
        <section className="lg:col-span-2 rounded-xl border bg-card p-4 anim-fade-up-2">
          <SectionTitle
            extra={
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <TrendingUp className="size-3" aria-hidden />
                {t.tasksDoneThisWeek}: <b className="num">{fmtNum(stats?.tasks.doneThisWeek ?? 0, settings.locale)}</b>
              </span>
            }
          >
            {t.trend14} — {t.donePerDay}
          </SectionTitle>
          <div className="h-52" dir="ltr">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="matinTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={34} />
                  <RTooltip
                    contentStyle={{ borderRadius: 12, fontSize: 12, background: "var(--popover)", border: "1px solid var(--border)", color: "var(--popover-foreground)" }}
                    formatter={(v) => [fmtNum(Number(v), settings.locale), t.donePerDay]}
                  />
                  <Area type="monotone" dataKey="done" stroke="var(--chart-1)" strokeWidth={2} fill="url(#matinTrend)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* budget + finance mini */}
        <section className="rounded-xl border bg-card p-4 anim-fade-up-2">
          <SectionTitle extra={<Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => quick("finance")}>{t.more}</Button>}>
            {t.budgetStatus}
          </SectionTitle>
          {budget > 0 ? (
            <>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">{t.budgetUsed}</span>
                <span className={"num font-bold " + (budgetPct >= 100 ? "text-rose-500" : budgetPct >= 80 ? "text-amber-500" : "text-emerald-500")}>
                  {fmtNum(budgetPct, settings.locale)}٪
                </span>
              </div>
              <Progress value={budgetPct} className="mt-2 h-2.5" />
              <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-muted/60 p-2">
                  <div className="text-muted-foreground text-[10px]">{t.monthExpense}</div>
                  <div className="num font-semibold">{fmtMoneyCompact(spentThisMonth, settings.locale, settings.currency)}</div>
                </div>
                <div className="rounded-lg bg-muted/60 p-2">
                  <div className="text-muted-foreground text-[10px]">{t.remaining}</div>
                  <div className="num font-semibold">{fmtMoneyCompact(Math.max(0, budget - spentThisMonth), settings.locale, settings.currency)}</div>
                </div>
              </div>
              {budgetPct >= 80 && <p className="mt-2 text-[11px] font-medium text-amber-600 dark:text-amber-400">{t.overBudget}</p>}
            </>
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground">
              {t.monthlyBudget}: —<br />{t.sec_prefs}
            </p>
          )}

          <Separator className="my-3.5" />

          <div className="grid grid-cols-3 gap-2 text-center">
            <button onClick={() => quick("notes")} className="rounded-lg p-2 hover:bg-muted transition-colors">
              <StickyNote className="mx-auto size-4 text-muted-foreground" aria-hidden />
              <div className="num mt-1 text-sm font-bold">{fmtNum(stats?.counts.notes ?? 0, settings.locale)}</div>
              <div className="text-[10px] text-muted-foreground">{t.stat_notes}</div>
            </button>
            <button onClick={() => quick("calendar")} className="rounded-lg p-2 hover:bg-muted transition-colors">
              <CalendarClock className="mx-auto size-4 text-muted-foreground" aria-hidden />
              <div className="num mt-1 text-sm font-bold">{fmtNum(stats?.counts.upcomingEvents ?? 0, settings.locale)}</div>
              <div className="text-[10px] text-muted-foreground">{t.upcomingEventsCount}</div>
            </button>
            <button onClick={() => quick("finance")} className="rounded-lg p-2 hover:bg-muted transition-colors">
              <Wallet className="mx-auto size-4 text-muted-foreground" aria-hidden />
              <div className="num mt-1 text-sm font-bold">{fmtMoneyCompact(stats?.finance.balance ?? 0, settings.locale, settings.currency)}</div>
              <div className="text-[10px] text-muted-foreground">{t.stat_balance}</div>
            </button>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* today tasks */}
        <section className="lg:col-span-2 rounded-xl border bg-card p-4 anim-fade-up-3">
          <SectionTitle extra={<Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => quick("tasks")}>{t.more}</Button>}>
            {t.todayTasks}
          </SectionTitle>
          {todayTasks.length === 0 ? (
            <EmptyState icon={ListTodo} title={t.noTasksToday} />
          ) : (
            <ul className="divide-y">
              {todayTasks.slice(0, 6).map((task) => {
                const project = projects.find((p) => p.id === task.projectId);
                return (
                  <li key={task.id} className="flex items-center gap-2.5 py-2.5">
                    {project ? <Dot color={project.color} /> : <span className="size-2.5" />}
                    <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
                    <PrioBadge priority={task.priority as never} t={t} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* upcoming events */}
        <section className="rounded-xl border bg-card p-4 anim-fade-up-3">
          <SectionTitle extra={<Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => quick("calendar")}>{t.more}</Button>}>
            {t.upcomingEvents}
          </SectionTitle>
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarClock} title={t.noEvents} />
          ) : (
            <ul className="grid gap-2.5">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-center gap-2.5 rounded-lg border bg-muted/30 px-3 py-2">
                  <div className="text-center">
                    <div className="num text-sm font-bold leading-none">{fmtDate(e.date, settings.locale, { day: "numeric" })}</div>
                    <div className="text-[10px] text-muted-foreground">{fmtDate(e.date, settings.locale, { month: "short" })}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{e.title}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {fmtRelative(e.date, settings.locale, t)}{e.time ? ` · ${fmtTime(e.time, settings.locale)}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* quick actions */}
      <section className="rounded-xl border bg-card p-4">
        <SectionTitle>{t.quickActions}</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {([
            { key: "tasks", icon: ListTodo, label: t.newTask },
            { key: "notes", icon: StickyNote, label: t.newNote },
            { key: "finance", icon: Wallet, label: t.newTx },
            { key: "calendar", icon: CalendarClock, label: t.newEvent },
          ] as const).map((a) => (
            <button
              key={a.key}
              onClick={() => quick(a.key)}
              className="flex items-center gap-2.5 rounded-xl border bg-muted/30 px-3.5 py-3 text-sm font-medium transition-all hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
            >
              <span className="rounded-lg bg-primary/15 p-1.5 text-primary"><a.icon className="size-4" aria-hidden /></span>
              {a.label}
              <Plus className="ms-auto size-3.5 text-muted-foreground" aria-hidden />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
