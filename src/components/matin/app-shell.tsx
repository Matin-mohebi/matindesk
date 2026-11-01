"use client";

import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  LayoutDashboard, ListTodo, StickyNote, Bookmark as BookmarkIcon,
  Wallet, CalendarDays, Settings as SettingsIcon, Search, Bell,
  Sun, Moon, Menu, ShieldCheck,
} from "lucide-react";
import { useMatin, computeAlerts } from "@/lib/matin/store";
import { getDict, dirOf } from "@/lib/matin/i18n";
import { todayISO } from "@/lib/matin/helpers";
import type { Locale } from "@/lib/matin/types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { DashboardView } from "./dashboard";
import { TasksView } from "./tasks-view";
import { NotesView } from "./notes-view";
import { BookmarksView } from "./bookmarks-view";
import { FinanceView } from "./finance-view";
import { CalendarView } from "./calendar-view";
import { SettingsView } from "./settings-view";
import { GlobalSearch } from "./global-search";
import { NotificationCenter } from "./notification-center";
import { toast as sonnerToast } from "sonner";

export type ViewKey = "dashboard" | "tasks" | "notes" | "bookmarks" | "finance" | "calendar" | "settings";

export const VIEW_KEYS: ViewKey[] = ["dashboard", "tasks", "notes", "bookmarks", "finance", "calendar", "settings"];

const NAV_ICONS: Record<ViewKey, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  tasks: ListTodo,
  notes: StickyNote,
  bookmarks: BookmarkIcon,
  finance: Wallet,
  calendar: CalendarDays,
  settings: SettingsIcon,
};

export function AppShell() {
  const settings = useMatin((s) => s.settings);
  const setSettings = useMatin((s) => s.setSettings);
  const storeData = useMatin(
    useShallow((s) => ({
      tasks: s.tasks, notes: s.notes, bookmarks: s.bookmarks,
      transactions: s.transactions, events: s.events, readAlerts: s.readAlerts,
    }))
  );
  const [view, setView] = useState<ViewKey>("dashboard");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const locale: Locale = settings.locale;
  const t = getDict(locale);
  const dir = dirOf(locale);

  // Apply locale / direction / accent / font scale to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = dir;
    root.dataset.accent = settings.accent;
    root.style.setProperty("--font-scale", String(settings.fontScale));
  }, [locale, dir, settings.accent, settings.fontScale]);

  // Apply theme (light / dark / system)
  useEffect(() => {
    const root = document.documentElement;
    const apply = (dark: boolean) => root.classList.toggle("dark", dark);
    if (settings.theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mq.matches);
      const fn = (e: MediaQueryListEvent) => apply(e.matches);
      mq.addEventListener("change", fn);
      return () => mq.removeEventListener("change", fn);
    }
    apply(settings.theme === "dark");
  }, [settings.theme]);

  // Ctrl+K global search
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  const alerts = useMemo(() => computeAlerts({ ...storeData, settings }), [storeData, settings]);
  const unreadCount = alerts.filter((a) => !storeData.readAlerts.includes("*") && !storeData.readAlerts.includes(a.id)).length;

  const go = (v: ViewKey) => {
    setView(v);
    setMobileNav(false);
  };

  const toggleThemeQuick = () => {
    const isDark =
      settings.theme === "dark" ||
      (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setSettings({ theme: isDark ? "light" : "dark" });
    sonnerToast(isDark ? t.th_light : t.th_dark);
  };

  const todayLine = useMemo(() => {
    try {
      const tag = locale === "fa" ? "fa-IR" : locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-US";
      return new Intl.DateTimeFormat(tag, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
    } catch {
      return todayISO();
    }
  }, [locale]);

  const navList = (
    <nav className="flex flex-col gap-1" aria-label={t.menu}>
      {VIEW_KEYS.map((k) => {
        const Icon = NAV_ICONS[k];
        const active = view === k;
        return (
          <button
            key={k}
            onClick={() => go(k)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              "min-h-[44px]",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="size-[18px] shrink-0" />
            <span>{t[`nav_${k}`]}</span>
          </button>
        );
      })}
    </nav>
  );

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t.greetingMorning;
    if (h < 17) return t.greetingAfternoon;
    if (h < 21) return t.greetingEvening;
    return t.greetingNight;
  })();

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={dir}>
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
          {/* Mobile menu */}
          <Sheet open={mobileNav} onOpenChange={setMobileNav}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label={t.menu}>
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={dir === "rtl" ? "right" : "left"} className="w-72 p-4">
              <SheetHeader className="p-0 pb-4">
                <SheetTitle className="flex items-center gap-2.5">
                  <Logo size={32} />
                  <span className="font-bold">{t.appName}</span>
                </SheetTitle>
              </SheetHeader>
              {navList}
            </SheetContent>
          </Sheet>

          <button
            onClick={() => go("dashboard")}
            className="flex items-center gap-2.5 rounded-xl px-1 py-1 transition-opacity hover:opacity-80"
            aria-label={t.appName}
          >
            <Logo size={34} />
            <span className="hidden font-bold text-[15px] sm:block">{t.appName}</span>
          </button>

          <span className="hidden lg:block text-xs text-muted-foreground ms-3 border-s ps-3">
            {greeting}{settings.userName ? `، ${settings.userName}` : ""} — {todayLine}
          </span>

          <div className="flex-1" />

          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 rounded-xl border bg-muted/50 px-3 h-9 text-sm text-muted-foreground transition-colors hover:bg-muted min-w-[180px] md:min-w-[240px]"
            aria-label={t.searchAll}
          >
            <Search className="size-4" />
            <span className="flex-1 text-start">{t.searchAll}</span>
            <kbd className="rounded bg-background border px-1.5 text-[10px] num">Ctrl K</kbd>
          </button>
          <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setSearchOpen(true)} aria-label={t.searchAll}>
            <Search className="size-5" />
          </Button>

          <NotificationCenter
            alerts={alerts}
            unreadCount={unreadCount}
            locale={locale}
            onNavigate={go}
          />

          <Button variant="ghost" size="icon" onClick={toggleThemeQuick} aria-label={t.theme}>
            <Sun className="size-5 dark:hidden" />
            <Moon className="hidden dark:block size-5" />
          </Button>
        </div>
      </header>

      {/* ===== Body ===== */}
      <div className="flex flex-1">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex w-60 lg:w-64 shrink-0 flex-col border-e bg-sidebar p-3 sticky top-14 h-[calc(100vh-3.5rem)]">
          {navList}
          <div className="mt-auto flex flex-col gap-2 px-2 pb-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-primary" />
              <span>{t.offlineBadge}</span>
            </div>
            <div className="num">v0.1.0 — Web</div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-3 sm:p-6 pb-10">
          <div className="mx-auto w-full max-w-6xl">
            {view === "dashboard" && (
              <DashboardView t={t} locale={locale} settings={settings} onNavigate={go} greeting={greeting} />
            )}
            {view === "tasks" && <TasksView t={t} locale={locale} />}
            {view === "notes" && <NotesView t={t} locale={locale} />}
            {view === "bookmarks" && <BookmarksView t={t} locale={locale} />}
            {view === "finance" && <FinanceView t={t} locale={locale} />}
            {view === "calendar" && <CalendarView t={t} locale={locale} />}
            {view === "settings" && <SettingsView t={t} locale={locale} onToast={(o) => sonnerToast(o.title)} />}
          </div>
        </main>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} t={t} locale={locale} onNavigate={go} />
    </div>
  );
}
