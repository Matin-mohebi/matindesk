"use client";

import { useMemo } from "react";
import {
  ListTodo, StickyNote, Bookmark as BookmarkIcon, CalendarDays, Wallet, Compass,
} from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { useMatin } from "@/lib/matin/store";
import { fmtDate, fmtMoney, hostOf } from "@/lib/matin/helpers";
import type { Locale } from "@/lib/matin/types";
import type { T } from "@/lib/matin/i18n";
import type { ViewKey } from "./app-shell";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  t: T;
  locale: Locale;
  onNavigate: (v: ViewKey) => void;
}

export function GlobalSearch({ open, onOpenChange, t, locale, onNavigate }: Props) {
  const tasks = useMatin((s) => s.tasks);
  const notes = useMatin((s) => s.notes);
  const bookmarks = useMatin((s) => s.bookmarks);
  const events = useMatin((s) => s.events);
  const transactions = useMatin((s) => s.transactions);
  const settings = useMatin((s) => s.settings);

  const q = ""; // cmdk filters by input itself

  const results = useMemo(() => {
    return {
      tasks: q ? tasks : tasks,
      notes, bookmarks, events, transactions,
    };
  }, [tasks, notes, bookmarks, events, transactions]);

  const go = (v: ViewKey) => {
    onOpenChange(false);
    onNavigate(v);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title={t.searchAll} description={t.searchAll}>
      <CommandInput placeholder={t.searchPlaceholder} />
      <CommandList>
        <CommandEmpty>{t.noResults}</CommandEmpty>

        <CommandGroup heading={t.sec_pages}>
          {(["dashboard", "tasks", "notes", "bookmarks", "finance", "calendar", "settings"] as ViewKey[]).map((k) => (
            <CommandItem key={k} onSelect={() => go(k)}>
              <Compass className="text-primary" />
              <span>{t[`nav_${k}`]}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {results.tasks.length > 0 && (
          <CommandGroup heading={t.sec_tasks}>
            {results.tasks.slice(0, 6).map((task) => (
              <CommandItem key={task.id} value={`task ${task.title}`} onSelect={() => go("tasks")}>
                <ListTodo className="text-muted-foreground" />
                <span className="truncate">{task.title}</span>
                {task.dueDate && (
                  <span className="ms-auto text-xs text-muted-foreground num">{fmtDate(task.dueDate, locale, { day: "numeric", month: "short" })}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {notes.length > 0 && (
          <CommandGroup heading={t.sec_notes}>
            {notes.slice(0, 5).map((n) => (
              <CommandItem key={n.id} value={`note ${n.title} ${n.content}`} onSelect={() => go("notes")}>
                <StickyNote className="text-muted-foreground" />
                <span className="truncate">{n.title || t.untitled}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {bookmarks.length > 0 && (
          <CommandGroup heading={t.sec_bookmarks}>
            {bookmarks.slice(0, 5).map((b) => (
              <CommandItem key={b.id} value={`bm ${b.title} ${b.url}`} onSelect={() => go("bookmarks")}>
                <BookmarkIcon className="text-muted-foreground" />
                <span className="truncate">{b.title}</span>
                <span className="ms-auto text-xs text-muted-foreground">{hostOf(b.url)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {events.length > 0 && (
          <CommandGroup heading={t.sec_events}>
            {events.slice(0, 5).map((e) => (
              <CommandItem key={e.id} value={`ev ${e.title}`} onSelect={() => go("calendar")}>
                <CalendarDays className="text-muted-foreground" />
                <span className="truncate">{e.title}</span>
                <span className="ms-auto text-xs text-muted-foreground num">{fmtDate(e.date, locale, { day: "numeric", month: "short" })}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {transactions.length > 0 && (
          <CommandGroup heading={t.sec_tx}>
            {transactions.slice(0, 5).map((x) => (
              <CommandItem key={x.id} value={`tx ${x.note ?? ""} ${x.category}`} onSelect={() => go("finance")}>
                <Wallet className="text-muted-foreground" />
                <span className="truncate">{x.note || t[x.category as keyof T] as string || x.category}</span>
                <span className="ms-auto text-xs num">{fmtMoney(x.amount, locale, settings.currency)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
