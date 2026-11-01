"use client";
// MatinDesk — notification center (computed from live data, read state per device).
import { useState } from "react";
import { Bell, AlertTriangle, CalendarClock, Wallet, CircleAlert } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMatin, computeAlerts } from "@/lib/matin/store";
import { getDict } from "@/lib/matin/i18n";
import { fmtRelative } from "@/lib/matin/helpers";

const LS_KEY = "matindesk-read-alerts";

function readSet(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]"); } catch { return []; }
}

export default function NotificationCenter({ onNavigate }: { onNavigate: (view: "tasks" | "calendar" | "finance") => void }) {
  const { tasks, events, transactions, settings, setView } = useMatin();
  const t = getDict(settings.locale);
  const [read, setRead] = useState<string[]>(() => readSet());
  const [open, setOpen] = useState(false);

  const alerts = computeAlerts({ tasks, events, transactions, settings });
  const unread = alerts.filter((a) => !read.includes(a.id));

  function markAll() {
    const all = alerts.map((a) => a.id);
    setRead(all);
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  }

  const iconFor = (kind: string) => {
    if (kind === "alert_overdue") return <CircleAlert className="size-4 text-rose-500" aria-hidden />;
    if (kind === "alert_dueToday") return <AlertTriangle className="size-4 text-amber-500" aria-hidden />;
    if (kind === "alert_eventSoon") return <CalendarClock className="size-4 text-teal-500" aria-hidden />;
    return <Wallet className="size-4 text-amber-500" aria-hidden />;
  };

  const targetFor = (kind: string): "tasks" | "calendar" | "finance" =>
    kind === "alert_eventSoon" ? "calendar" : kind === "alert_budget" ? "finance" : "tasks";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t.notifCenter}>
          <Bell className="size-5" aria-hidden />
          {unread.length > 0 && (
            <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white num">
              {unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b">
          <span className="text-sm font-semibold">{t.notifCenter}</span>
          {alerts.length > 0 && (
            <button onClick={markAll} className="text-xs text-primary hover:underline">{t.markAllRead}</button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {unread.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">{t.noNotifs}</div>
          ) : (
            <ul className="divide-y">
              {unread.map((a) => (
                <li key={a.id}>
                  <button
                    className="flex w-full items-start gap-2.5 px-3 py-2.5 text-start hover:bg-muted/60 transition-colors"
                    onClick={() => { setOpen(false); onNavigate(targetFor(a.kind)); }}
                  >
                    <span className="mt-0.5">{iconFor(a.kind)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-medium text-muted-foreground">
                        {t[a.kind as keyof typeof t] as string}
                        {a.meta ? <span className="num"> · {fmtRelative(a.meta, settings.locale, t)}</span> : null}
                      </span>
                      <span className="block truncate text-sm">
                        {a.title === "budget" ? t.budgetAlertBody : a.title}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
