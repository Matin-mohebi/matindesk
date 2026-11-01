"use client";
// MatinDesk — application shell: desktop sidebar, mobile bottom nav, header, view switch.
import { useState } from "react";
import {
  LayoutDashboard, ListTodo, StickyNote, Bookmark, Wallet, CalendarDays,
  Settings as SettingsIcon, Moon, Sun, LogOut, Menu, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMatin, api, type ViewKey } from "@/lib/matin/store";
import { getDict, dirOf } from "@/lib/matin/i18n";
import { cn } from "@/lib/utils";
import NotificationCenter from "./notifications";
import CommandPalette, { useCommandPalette, SearchIconTrigger } from "./command-palette";
import Dashboard from "./dashboard";
import TasksView from "./tasks-view";
import NotesView from "./notes-view";
import BookmarksView from "./bookmarks-view";
import FinanceView from "./finance-view";
import CalendarView from "./calendar-view";
import SettingsView from "./settings-view";

const NAV: { key: ViewKey; icon: typeof ListTodo; labelKey: "nav_dashboard" | "nav_tasks" | "nav_notes" | "nav_bookmarks" | "nav_finance" | "nav_calendar" | "nav_settings" }[] = [
  { key: "dashboard", icon: LayoutDashboard, labelKey: "nav_dashboard" },
  { key: "tasks", icon: ListTodo, labelKey: "nav_tasks" },
  { key: "notes", icon: StickyNote, labelKey: "nav_notes" },
  { key: "bookmarks", icon: Bookmark, labelKey: "nav_bookmarks" },
  { key: "finance", icon: Wallet, labelKey: "nav_finance" },
  { key: "calendar", icon: CalendarDays, labelKey: "nav_calendar" },
  { key: "settings", icon: SettingsIcon, labelKey: "nav_settings" },
];

const MOBILE_MAIN: ViewKey[] = ["dashboard", "tasks", "calendar", "finance"];
const MOBILE_MORE: ViewKey[] = ["notes", "bookmarks", "settings"];

export default function Shell() {
  const { user, view, setView, settings, setUser, clearLocal } = useMatin();
  const t = getDict(settings.locale);
  const palette = useCommandPalette();
  const [moreOpen, setMoreOpen] = useState(false);

  const dir = dirOf(settings.locale);
  const title = t[NAV.find((n) => n.key === view)?.labelKey ?? "nav_dashboard"];

  async function signOut() {
    try { await api("/api/auth/logout", { method: "POST" }); } catch { /* ignore */ }
    clearLocal();
    setUser(null);
  }

  const NavButton = ({ item, mobile = false }: { item: (typeof NAV)[number]; mobile?: boolean }) => {
    const active = view === item.key;
    const inner = (
      <button
        onClick={() => { setView(item.key); setMoreOpen(false); }}
        className={cn(
          "flex items-center gap-3 rounded-xl text-sm font-medium transition-colors",
          mobile ? "flex-col gap-1 px-2 py-1 text-[10px] w-full" : "w-full px-3.5 py-2.5",
          active
            ? "bg-primary/12 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        aria-current={active ? "page" : undefined}
      >
        <item.icon className={cn(mobile ? "size-5" : "size-4.5")} aria-hidden />
        <span>{t[item.labelKey] as string}</span>
      </button>
    );
    return inner;
  };

  return (
    <div dir={dir} className="min-h-screen bg-background">
      <TooltipProvider delayDuration={200}>
        {/* ---------- Desktop sidebar ---------- */}
        <aside className="hidden md:flex fixed inset-y-0 start-0 w-64 flex-col border-e bg-sidebar z-40">
          <div className="flex items-center gap-3 px-5 py-5">
            <div className="rounded-xl bg-primary p-2 shadow">
              <LayoutDashboard className="size-5 text-primary-foreground" aria-hidden />
            </div>
            <div className="leading-tight">
              <div className="font-bold">MatinDesk</div>
              <div className="text-[10px] text-muted-foreground">{t.offlineBadge}</div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-2 grid gap-1 content-start" aria-label="Main">
            {NAV.map((item) => (
              <NavButton key={item.key} item={item} />
            ))}
          </nav>

          <div className="border-t p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-2.5 rounded-xl p-2 text-start hover:bg-muted transition-colors">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                      {(user?.name ?? "?").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">{user?.name}</span>
                    <span dir="ltr" className="block truncate text-[10px] text-muted-foreground text-start">{user?.email}</span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel className="text-xs">
                  {user?.name}
                  <span dir="ltr" className="block font-normal text-muted-foreground">{user?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setView("settings")}>
                  <SettingsIcon className="size-4" aria-hidden /> {t.nav_settings}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} variant="destructive">
                  <LogOut className="size-4" aria-hidden /> {t.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* ---------- Main column ---------- */}
        <div className="md:ps-64 flex min-h-screen flex-col">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
            <div className="flex items-center gap-2 px-4 md:px-6 py-3">
              {/* mobile brand + more menu */}
              <div className="md:hidden flex items-center gap-2 min-w-0">
                <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={t.menu}>
                      <Menu className="size-5" aria-hidden />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side={dir === "rtl" ? "right" : "left"} className="w-64 p-0">
                    <SheetHeader className="px-5 pt-5 pb-2">
                      <SheetTitle className="flex items-center gap-2 text-base">
                        <span className="rounded-lg bg-primary p-1.5">
                          <LayoutDashboard className="size-4 text-primary-foreground" aria-hidden />
                        </span>
                        MatinDesk
                      </SheetTitle>
                    </SheetHeader>
                    <nav className="px-3 py-2 grid gap-1">
                      {MOBILE_MORE.map((key) => {
                        const item = NAV.find((n) => n.key === key)!;
                        return <NavButton key={key} item={item} />;
                      })}
                    </nav>
                    <div className="absolute bottom-4 inset-x-3 border-t pt-3">
                      <button
                        onClick={signOut}
                        className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                      >
                        <LogOut className="size-4" aria-hidden /> {t.signOut}
                      </button>
                    </div>
                  </SheetContent>
                </Sheet>
                <span className="font-bold truncate">{title}</span>
              </div>

              <h1 className="hidden md:block text-lg font-bold">{title}</h1>

              <div className="ms-auto flex items-center gap-1.5">
                <SearchIconTrigger onClick={() => palette.setOpen(true)} label={t.search} />

                <NotificationCenter onNavigate={(v) => setView(v)} />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost" size="icon"
                      aria-label={settings.theme === "dark" ? t.th_light : t.th_dark}
                      onClick={() => useMatin.getState().setSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
                    >
                      {settings.theme === "dark" ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{settings.theme === "dark" ? t.th_light : t.th_dark}</TooltipContent>
                </Tooltip>

                {/* avatar (mobile) */}
                <Avatar className="md:hidden size-8">
                  <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-bold">
                    {(user?.name ?? "?").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          {/* Views */}
          <main className="flex-1 px-4 md:px-6 py-5 pb-24 md:pb-8 max-w-6xl w-full mx-auto">
            {view === "dashboard" && <Dashboard />}
            {view === "tasks" && <TasksView />}
            {view === "notes" && <NotesView />}
            {view === "bookmarks" && <BookmarksView />}
            {view === "finance" && <FinanceView />}
            {view === "calendar" && <CalendarView />}
            {view === "settings" && <SettingsView />}
          </main>

          {/* Footer */}
          <footer className="hidden md:block border-t py-4 text-center text-[11px] text-muted-foreground">
            MatinDesk v0.2.0 · {t.offlineBadge} · {t.accuracyNote}
          </footer>
        </div>

        {/* ---------- Mobile bottom nav ---------- */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]" aria-label="Bottom">
          <div className="grid grid-cols-5 py-1.5">
            {MOBILE_MAIN.map((key) => {
              const item = NAV.find((n) => n.key === key)!;
              return <NavButton key={key} item={item} mobile />;
            })}
            <button
              onClick={() => setView("notes")}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1 text-[10px] w-full",
                view === "notes" ? "text-primary" : "text-muted-foreground"
              )}
            >
              <StickyNote className="size-5" aria-hidden />
              <span>{t.nav_notes}</span>
            </button>
          </div>
        </nav>

        <CommandPalette open={palette.open} setOpen={palette.setOpen} />
      </TooltipProvider>
    </div>
  );
}
