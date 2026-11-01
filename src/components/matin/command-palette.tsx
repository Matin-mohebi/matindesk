"use client";
// MatinDesk — global search (Ctrl+K): server search with local fallback + quick navigation.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, ListTodo, StickyNote, Bookmark, CalendarDays, Wallet, LayoutDashboard,
  Settings, CornerDownLeft,
} from "lucide-react";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem,
} from "@/components/ui/command";
import { useMatin, api } from "@/lib/matin/store";
import { getDict } from "@/lib/matin/i18n";
import { fmtMoney, hostOf } from "@/lib/matin/helpers";
import type { ViewKey } from "@/lib/matin/store";

interface SearchResponse {
  results: {
    tasks: { id: string; title: string; status: string }[];
    notes: { id: string; title: string; content: string }[];
    bookmarks: { id: string; title: string; url: string }[];
    events: { id: string; title: string; date: string }[];
    transactions: { id: string; amount: number; type: string; note: string | null; category: string; date: string }[];
  };
}

export default function CommandPalette({
  open, setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const { settings, transactions, tasks, notes, bookmarks, events, setView } = useMatin();
  const t = getDict(settings.locale);
  const [q, setQ] = useState("");
  const [remote, setRemote] = useState<{ q: string; results: SearchResponse["results"] } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // reset search state whenever the dialog is opened (adjust-state-during-render pattern)
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQ("");
      setRemote(null);
    }
  }

  // debounced server search (setState only inside async callback)
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const needle = q.trim();
    if (needle.length < 2) return;
    timer.current = setTimeout(async () => {
      try {
        const res = await api<SearchResponse>(`/api/search?q=${encodeURIComponent(needle)}`);
        setRemote({ q: needle, results: res.results });
      } catch {
        setRemote(null);
      }
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  const localHits = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (n.length < 2) return null;
    const m = (s?: string | null) => (s ?? "").toLowerCase().includes(n);
    return {
      tasks: tasks.filter((x) => m(x.title) || m(x.description)).slice(0, 8),
      notes: notes.filter((x) => m(x.title) || m(x.content)).slice(0, 8),
      bookmarks: bookmarks.filter((x) => m(x.title) || m(x.url)).slice(0, 6),
      events: events.filter((x) => m(x.title)).slice(0, 6),
      transactions: transactions.filter((x) => m(x.note) || m(x.category)).slice(0, 6),
    };
  }, [q, tasks, notes, bookmarks, events, transactions]);

  const R = remote && remote.q === q.trim() ? remote.results : localHits;
  const hasResults = R && (R.tasks.length + R.notes.length + R.bookmarks.length + R.events.length + R.transactions.length > 0);

  function go(view: ViewKey) {
    setView(view);
    setOpen(false);
  }

  const pages: { view: ViewKey; label: string; icon: typeof ListTodo }[] = [
    { view: "dashboard", label: t.nav_dashboard, icon: LayoutDashboard },
    { view: "tasks", label: t.nav_tasks, icon: ListTodo },
    { view: "notes", label: t.nav_notes, icon: StickyNote },
    { view: "bookmarks", label: t.nav_bookmarks, icon: Bookmark },
    { view: "finance", label: t.nav_finance, icon: Wallet },
    { view: "calendar", label: t.nav_calendar, icon: CalendarDays },
    { view: "settings", label: t.nav_settings, icon: Settings },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
      <CommandInput
        value={q}
        onValueChange={setQ}
        placeholder={t.searchPlaceholder}
      />
      <CommandList className="min-h-72">
        {q.trim().length < 2 && (
          <CommandGroup heading={t.sec_pages}>
            {pages.map((p) => (
              <CommandItem key={p.view} onSelect={() => go(p.view)}>
                <p.icon className="size-4 text-muted-foreground" aria-hidden />
                <span>{p.label}</span>
                <CornerDownLeft className="ms-auto size-3 text-muted-foreground" aria-hidden />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {q.trim().length >= 2 && !hasResults && <CommandEmpty>{t.noResults}</CommandEmpty>}

        {R && R.tasks.length > 0 && (
          <CommandGroup heading={t.sec_tasks}>
            {R.tasks.map((x) => (
              <CommandItem key={x.id} onSelect={() => go("tasks")}>
                <ListTodo className="size-4 text-muted-foreground" aria-hidden />
                <span className="truncate">{x.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {R && R.notes.length > 0 && (
          <CommandGroup heading={t.sec_notes}>
            {R.notes.map((x) => (
              <CommandItem key={x.id} onSelect={() => go("notes")}>
                <StickyNote className="size-4 text-muted-foreground" aria-hidden />
                <span className="truncate">{x.title || t.untitled}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {R && R.bookmarks.length > 0 && (
          <CommandGroup heading={t.sec_bookmarks}>
            {R.bookmarks.map((x) => (
              <CommandItem key={x.id} onSelect={() => go("bookmarks")}>
                <Bookmark className="size-4 text-muted-foreground" aria-hidden />
                <span className="truncate">{x.title} <span dir="ltr" className="text-muted-foreground">({hostOf(x.url)})</span></span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {R && R.events.length > 0 && (
          <CommandGroup heading={t.sec_events}>
            {R.events.map((x) => (
              <CommandItem key={x.id} onSelect={() => go("calendar")}>
                <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
                <span className="truncate">{x.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {R && R.transactions.length > 0 && (
          <CommandGroup heading={t.sec_tx}>
            {R.transactions.map((x) => (
              <CommandItem key={x.id} onSelect={() => go("finance")}>
                <Wallet className="size-4 text-muted-foreground" aria-hidden />
                <span className="truncate num">
                  {fmtMoney(x.amount, settings.locale, settings.currency)}
                  {x.note ? ` — ${x.note}` : ""}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  return { open, setOpen };
}

export function SearchIconTrigger({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex items-center gap-2 rounded-lg border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
    >
      <Search className="size-3.5" aria-hidden />
      <span className="hidden md:inline">{label}</span>
      <kbd dir="ltr" className="hidden md:inline-flex h-4 items-center rounded border bg-background px-1 font-mono text-[10px]">Ctrl K</kbd>
    </button>
  );
}
