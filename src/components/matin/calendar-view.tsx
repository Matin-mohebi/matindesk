"use client";
// MatinDesk — calendar view: month grid (Sat-start for fa/ar), day events, CRUD, Jalali labels.
import { useMemo, useState } from "react";
import { CalendarDays, Plus, Pencil, Trash2, ChevronRight, ChevronLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SectionTitle, EmptyState, ConfirmButton } from "./bits";
import { useMatin } from "@/lib/matin/store";
import { getDict } from "@/lib/matin/i18n";
import {
  monthGrid, monthHeading, weekdayHeaders, todayISO, fmtDate, fmtTime, fmtRelative,
} from "@/lib/matin/helpers";
import type { CalEvent } from "@/lib/matin/types";
import { cn } from "@/lib/utils";

export default function CalendarView() {
  const { events, tasks, settings, addEvent, updateEvent, deleteEvent } = useMatin();
  const t = getDict(settings.locale);
  const today = todayISO();

  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<string>(today);
  const [dlg, setDlg] = useState<{ open: boolean; editing: CalEvent | null; date: string }>({ open: false, editing: null, date: today });
  const [reminder, setReminder] = useState<string>("0");

  const grid = useMemo(() => monthGrid(cursor.getFullYear(), cursor.getMonth(), settings.locale), [cursor, settings.locale]);
  const headers = weekdayHeaders(settings.locale);
  const rtl = settings.locale !== "en";

  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of events) {
      const arr = m.get(e.date) ?? [];
      arr.push(e);
      m.set(e.date, arr);
    }
    return m;
  }, [events]);

  const tasksByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of tasks) {
      if (x.status !== "done" && x.dueDate) m.set(x.dueDate, (m.get(x.dueDate) ?? 0) + 1);
    }
    return m;
  }, [tasks]);

  const dayEvents = (eventsByDay.get(selected) ?? []).sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
  const upcoming = [...events].filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);

  function shiftMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 15));
  }

  function openNew(date: string) {
    setReminder("15");
    setDlg({ open: true, editing: null, date });
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    if (!title) return;
    const values = {
      title,
      date: String(fd.get("date") || dlg.date),
      time: String(fd.get("time") ?? "") || undefined,
      reminderMinutes: Number(reminder),
      note: String(fd.get("note") ?? "").trim() || undefined,
    };
    if (dlg.editing) updateEvent(dlg.editing.id, values);
    else addEvent(values);
    setDlg({ open: false, editing: null, date: today });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* calendar grid */}
      <section className="lg:col-span-3 rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold num">{monthHeading(cursor, settings.locale)}</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="size-8" onClick={() => shiftMonth(rtl ? 1 : -1)} aria-label="prev">
              {rtl ? <ChevronRight className="size-4" aria-hidden /> : <ChevronLeft className="size-4" aria-hidden />}
            </Button>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => shiftMonth(rtl ? -1 : 1)} aria-label="next">
              {rtl ? <ChevronLeft className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
          {headers.map((h, i) => <div key={i} className="py-1">{h}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map((cell) => {
            const hasEvents = (eventsByDay.get(cell.iso)?.length ?? 0) > 0;
            const dueCount = tasksByDay.get(cell.iso) ?? 0;
            const isToday = cell.iso === today;
            const isSel = cell.iso === selected;
            return (
              <button
                key={cell.iso}
                onClick={() => setSelected(cell.iso)}
                onDoubleClick={() => openNew(cell.iso)}
                className={cn(
                  "relative aspect-square rounded-lg text-xs transition-colors flex items-center justify-center",
                  !cell.inMonth && "text-muted-foreground/40",
                  cell.inMonth && "hover:bg-muted",
                  isSel && "bg-primary/15 ring-1 ring-primary text-primary font-bold",
                  isToday && !isSel && "font-bold text-primary"
                )}
                aria-label={cell.iso}
                aria-pressed={isSel}
              >
                <span className="num">{cell.day}</span>
                <span className="absolute bottom-1 flex items-center gap-0.5" aria-hidden>
                  {hasEvents && <span className="size-1.5 rounded-full bg-teal-500" />}
                  {dueCount > 0 && <span className="size-1.5 rounded-full bg-amber-500" />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-teal-500" aria-hidden /> {t.calendarTitle}</span>
          <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-amber-500" aria-hidden /> {t.dueDate}</span>
          <span className="ms-auto">{t.today}: {fmtDate(today, settings.locale)}</span>
        </div>
      </section>

      {/* day panel + upcoming */}
      <section className="lg:col-span-2 grid gap-4 content-start">
        <div className="rounded-xl border bg-card p-4">
          <SectionTitle extra={
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openNew(selected)}>
              <Plus className="size-3.5" aria-hidden /> {t.newEvent}
            </Button>
          }>
            {t.selectedDay} · <span className="num">{fmtDate(selected, settings.locale)}</span>
          </SectionTitle>
          {dayEvents.length === 0 ? (
            <EmptyState icon={CalendarDays} title={t.noEventsDay} />
          ) : (
            <ul className="grid gap-2">
              {dayEvents.map((e) => (
                <li key={e.id} className="group flex items-start gap-2.5 rounded-lg border bg-muted/30 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{e.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      {e.time ? (
                        <span className="flex items-center gap-0.5 num"><Clock className="size-3" aria-hidden />{fmtTime(e.time, settings.locale)}</span>
                      ) : (
                        <span>{t.noTime}</span>
                      )}
                      {e.reminderMinutes ? <span>· {t.reminder}</span> : null}
                    </div>
                  </div>
                  <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => { setReminder(String(e.reminderMinutes ?? 0)); setDlg({ open: true, editing: e, date: e.date }); }} aria-label={t.edit}>
                      <Pencil className="size-3" aria-hidden />
                    </Button>
                    <ConfirmButton
                      title={t.confirmDeleteTitle} body={t.confirmDeleteBody}
                      confirmLabel={t.yesDelete} cancelLabel={t.cancel}
                      onConfirm={() => deleteEvent(e.id)}
                    >
                      <Button variant="ghost" size="icon" className="size-7 text-destructive" aria-label={t.delete}>
                        <Trash2 className="size-3" aria-hidden />
                      </Button>
                    </ConfirmButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <SectionTitle>{t.upcoming}</SectionTitle>
          {upcoming.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">{t.noEvents}</p>
          ) : (
            <ul className="grid gap-1.5">
              {upcoming.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => setSelected(e.date)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start hover:bg-muted transition-colors"
                  >
                    <Badge variant="secondary" className="num text-[10px] shrink-0">{fmtRelative(e.date, settings.locale, t)}</Badge>
                    <span className="min-w-0 flex-1 truncate text-xs">{e.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* event dialog */}
      <Dialog open={dlg.open} onOpenChange={(o) => !o && setDlg({ open: false, editing: null, date: today })}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{dlg.editing ? t.editEvent : t.newEvent}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-3.5">
            <div className="grid gap-1.5">
              <Label htmlFor="ev-title">{t.eventTitle}</Label>
              <Input id="ev-title" name="title" defaultValue={dlg.editing?.title ?? ""} required autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ev-date">{t.date}</Label>
                <Input id="ev-date" name="date" type="date" defaultValue={dlg.editing?.date ?? dlg.date} className="num" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ev-time">{t.time} <span className="text-muted-foreground">({t.optional})</span></Label>
                <Input id="ev-time" name="time" type="time" defaultValue={dlg.editing?.time ?? ""} className="num" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>{t.reminder}</Label>
              <Select value={reminder} onValueChange={setReminder}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t.rem_none}</SelectItem>
                  <SelectItem value="15">{t.rem_15}</SelectItem>
                  <SelectItem value="60">{t.rem_60}</SelectItem>
                  <SelectItem value="1440">{t.rem_1440}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ev-note">{t.note} <span className="text-muted-foreground">({t.optional})</span></Label>
              <Input id="ev-note" name="note" defaultValue={dlg.editing?.note ?? ""} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDlg({ open: false, editing: null, date: today })}>{t.cancel}</Button>
              <Button type="submit">{t.save}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
