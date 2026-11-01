"use client";

import { useMemo } from "react";
import { Bell, AlertTriangle, CalendarClock, PiggyBank, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMatin } from "@/lib/matin/store";
import { getDict } from "@/lib/matin/i18n";
import { fmtDate, fmtRelative } from "@/lib/matin/helpers";
import type { Locale } from "@/lib/matin/types";
import type { ViewKey } from "./app-shell";
import { cn } from "@/lib/utils";

interface Props {
  alerts: { id: string; kind: string; refId: string; title: string; meta?: string }[];
  unreadCount: number;
  locale: Locale;
  onNavigate: (v: ViewKey) => void;
}

const KIND_ICON = {
  alert_overdue: AlertTriangle,
  alert_dueToday: CheckCircle2,
  alert_eventSoon: CalendarClock,
  alert_budget: PiggyBank,
} as const;

const KIND_VIEW: Record<string, ViewKey> = {
  alert_overdue: "tasks",
  alert_dueToday: "tasks",
  alert_eventSoon: "calendar",
  alert_budget: "finance",
};

export function NotificationCenter({ alerts, unreadCount, locale, onNavigate }: Props) {
  const t = getDict(locale);
  const readAlerts = useMatin((s) => s.readAlerts);
  const markAlertRead = useMatin((s) => s.markAlertRead);
  const markAllAlertsRead = useMatin((s) => s.markAllAlertsRead);

  const items = useMemo(() => alerts.map((a) => ({ ...a, unread: !readAlerts.includes("*") && !readAlerts.includes(a.id) })), [alerts, readAlerts]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t.notifCenter}>
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1 num">
              {unreadCount > 9 ? "9+" : new Intl.NumberFormat(locale === "fa" ? "fa-IR" : locale === "ar" ? "ar-EG" : "en-US").format(unreadCount)}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">{t.notifCenter}</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAlertsRead}>
              {t.markAllRead}
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <Bell className="size-8 opacity-40" />
              <span className="text-sm">{t.noNotifs}</span>
            </div>
          ) : (
            items.map((a) => {
              const Icon = KIND_ICON[a.kind as keyof typeof KIND_ICON] ?? Bell;
              const isBudget = a.kind === "alert_budget";
              return (
                <button
                  key={a.id}
                  onClick={() => {
                    markAlertRead(a.id);
                    onNavigate(KIND_VIEW[a.kind] ?? "dashboard");
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-start border-b last:border-0 transition-colors hover:bg-muted/60",
                    a.unread && "bg-primary/5"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                      a.kind === "alert_overdue" ? "bg-destructive/10 text-destructive" :
                      a.kind === "alert_budget" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                      "bg-primary/10 text-primary"
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">{isBudget ? t.alert_budget : t[a.kind as keyof typeof t] as string}</span>
                      {a.unread && <span className="size-1.5 rounded-full bg-primary" />}
                    </span>
                    <span className="block truncate text-sm font-medium mt-0.5">
                      {isBudget ? t.budgetAlertBody : a.title}
                    </span>
                    {a.meta && !isBudget && (
                      <span className="block text-xs text-muted-foreground mt-0.5 num">
                        {a.kind === "alert_eventSoon" ? fmtRelative(a.meta, locale, t) : fmtDate(a.meta, locale, { day: "numeric", month: "long" })}
                      </span>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
