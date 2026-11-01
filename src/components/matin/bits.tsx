"use client";
// MatinDesk — shared UI bits
import { type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { T } from "@/lib/matin/i18n";
import type { Priority, TaskStatus } from "@/lib/matin/types";

export function StatCard({
  icon: Icon, label, value, sub, tone = "default", className,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "good" | "warn" | "bad";
  className?: string;
}) {
  const toneCls = {
    default: "text-foreground",
    good: "text-emerald-600 dark:text-emerald-400",
    warn: "text-amber-600 dark:text-amber-400",
    bad: "text-rose-600 dark:text-rose-400",
  }[tone];
  return (
    <div className={cn(
      "rounded-xl border bg-card p-4 flex items-start gap-3 shadow-sm",
      className,
    )}>
      <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground truncate">{label}</div>
        <div className={cn("mt-0.5 text-lg font-bold num leading-tight truncate", toneCls)}>{value}</div>
        {sub ? <div className="mt-0.5 text-[11px] text-muted-foreground truncate">{sub}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, cta }: { icon: LucideIcon; title: string; cta?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-12 px-6 text-center">
      <div className="rounded-full bg-muted p-4 text-muted-foreground"><Icon className="size-7" aria-hidden /></div>
      <p className="text-sm text-muted-foreground max-w-xs">{title}</p>
      {cta}
    </div>
  );
}

export function SectionTitle({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold text-foreground/90">{children}</h2>
      {extra}
    </div>
  );
}

export function ConfirmButton({
  title, body, confirmLabel, cancelLabel, onConfirm, children,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PrioBadge({ priority, t }: { priority: Priority; t: T }) {
  const map: Record<Priority, { cls: string; key: keyof T }> = {
    low: { cls: "bg-slate-500/15 text-slate-600 dark:text-slate-300", key: "prio_low" },
    medium: { cls: "bg-teal-500/15 text-teal-700 dark:text-teal-300", key: "prio_medium" },
    high: { cls: "bg-amber-500/20 text-amber-700 dark:text-amber-300", key: "prio_high" },
    urgent: { cls: "bg-rose-500/20 text-rose-700 dark:text-rose-300", key: "prio_urgent" },
  } as const;
  const m = map[priority] ?? map.medium;
  return <Badge variant="secondary" className={cn("text-[10px] px-1.5", m.cls)}>{t[m.key] as string}</Badge>;
}

export function StatusBadge({ status, t }: { status: TaskStatus; t: T }) {
  const map: Record<TaskStatus, { cls: string; key: keyof T }> = {
    todo: { cls: "bg-muted text-muted-foreground", key: "status_todo" },
    in_progress: { cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300", key: "status_in_progress" },
    done: { cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", key: "status_done" },
  } as const;
  const m = map[status] ?? map.todo;
  return <Badge variant="secondary" className={cn("text-[10px] px-1.5", m.cls)}>{t[m.key] as string}</Badge>;
}

export function Dot({ color }: { color: string }) {
  return <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />;
}
