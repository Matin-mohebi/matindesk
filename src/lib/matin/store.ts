// MatinDesk — client store: hydrated from the server, optimistic mutations.
// Every mutation updates the UI instantly, then persists to the account via API.
import { create } from "zustand";
import type {
  Bookmark, CalEvent, Note, Project, Task, Transaction,
  Locale, ThemeMode, Accent,
} from "./types";

// ---------- server shapes ----------
export interface MatinUser {
  id: string;
  email: string;
  name: string;
}

export interface AppSettings {
  locale: Locale;
  theme: ThemeMode;
  accent: Accent;
  fontScale: number;
  currency: string;
  monthlyBudget: number;
  githubLogin: string | null;
  lastBackupAt: string | null;
}

export const defaultSettings: AppSettings = {
  locale: "fa",
  theme: "dark",
  accent: "emerald",
  fontScale: 1,
  currency: "IRT",
  monthlyBudget: 0,
  githubLogin: null,
  lastBackupAt: null,
};

// ---------- API helper ----------
export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(String(body.error ?? res.status)), { code: body.error });
  return body as T;
}

function iso(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// ---------- store ----------
export type ViewKey = "dashboard" | "tasks" | "notes" | "bookmarks" | "finance" | "calendar" | "settings";

interface MatinStore {
  ready: boolean;
  user: MatinUser | null;
  view: ViewKey;
  settings: AppSettings;
  projects: Project[];
  tasks: Task[];
  notes: Note[];
  bookmarks: Bookmark[];
  transactions: Transaction[];
  events: CalEvent[];

  hydrate: () => Promise<void>;
  setView: (v: ViewKey) => void;
  setUser: (u: MatinUser | null) => void;
  applyLocalSettings: (patch: Partial<AppSettings>) => void;
  setSettings: (patch: Partial<AppSettings>) => void;

  addProject: (name: string, color: string) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  addTask: (t: Partial<Task> & { title: string }) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskDone: (id: string) => void;

  addNote: (n: Pick<Note, "title" | "content" | "color">) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  togglePin: (id: string) => void;

  addBookmark: (b: Pick<Bookmark, "title" | "url" | "category">) => void;
  updateBookmark: (id: string, patch: Partial<Bookmark>) => void;
  deleteBookmark: (id: string) => void;

  addTx: (x: Omit<Transaction, "id" | "createdAt">) => void;
  updateTx: (id: string, patch: Partial<Transaction>) => void;
  deleteTx: (id: string) => void;

  addEvent: (e: Omit<CalEvent, "id" | "createdAt">) => void;
  updateEvent: (id: string, patch: Partial<CalEvent>) => void;
  deleteEvent: (id: string) => void;

  clearLocal: () => void;
}

type EntityName = "projects" | "tasks" | "notes" | "bookmarks" | "transactions" | "events";

async function send(entity: EntityName, action: "POST" | "PATCH" | "DELETE", body?: unknown, id?: string) {
  if (action === "POST") return api(`/api/entity/${entity}`, { method: "POST", body: JSON.stringify(body) });
  if (action === "PATCH") return api(`/api/entity/${entity}`, { method: "PATCH", body: JSON.stringify(body) });
  return api(`/api/entity/${entity}?id=${encodeURIComponent(id ?? "")}`, { method: "DELETE" });
}

// fire-and-forget persistence with a hard refetch fallback on failure
function persist(fn: () => Promise<unknown>, hydrate: () => Promise<void>) {
  fn().catch(async (e) => {
    console.error("sync failed:", e);
    await hydrate().catch(() => {});
  });
}

export const useMatin = create<MatinStore>((set, get) => ({
  ready: false,
  user: null,
  view: "dashboard" as ViewKey,
  settings: { ...defaultSettings },
  projects: [],
  tasks: [],
  notes: [],
  bookmarks: [],
  transactions: [],
  events: [],

  hydrate: async () => {
    try {
      const data = await api<{
        user: MatinUser;
        settings: AppSettings;
        projects: Project[];
        tasks: Task[];
        notes: Note[];
        bookmarks: Bookmark[];
        transactions: Transaction[];
        events: CalEvent[];
      }>("/api/data");
      set({
        ready: true,
        user: data.user,
        settings: { ...defaultSettings, ...data.settings },
        projects: data.projects ?? [],
        tasks: data.tasks ?? [],
        notes: data.notes ?? [],
        bookmarks: data.bookmarks ?? [],
        transactions: data.transactions ?? [],
        events: data.events ?? [],
      });
    } catch {
      set({ ready: true, user: null });
    }
  },

  setView: (v) => set({ view: v }),
  setUser: (user) => set({ user }),
  applyLocalSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

  setSettings: (patch) => {
    set((s) => ({ settings: { ...s.settings, ...patch } }));
    persist(() => api("/api/settings", { method: "PATCH", body: JSON.stringify(patch) }), get().hydrate);
  },

  // ---- projects ----
  addProject: (name, color) => {
    const tmp: Project = { id: `tmp-${Date.now()}`, name, color, createdAt: new Date().toISOString() };
    set((s) => ({ projects: [...s.projects, tmp] }));
    persist(async () => {
      const { row } = await send("projects", "POST", { name, color });
      set((s) => ({ projects: s.projects.map((p) => (p.id === tmp.id ? row : p)) }));
    }, get().hydrate);
  },
  updateProject: (id, patch) => {
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
    persist(() => send("projects", "PATCH", { id, ...patch }), get().hydrate);
  },
  deleteProject: (id) => {
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      tasks: s.tasks.map((t) => (t.projectId === id ? { ...t, projectId: undefined } : t)),
    }));
    persist(() => send("projects", "DELETE", undefined, id), get().hydrate);
  },

  // ---- tasks ----
  addTask: (t) => {
    const tmp: Task = {
      id: `tmp-${Date.now()}`,
      title: t.title,
      description: t.description,
      projectId: t.projectId,
      priority: t.priority ?? "medium",
      status: t.status ?? "todo",
      dueDate: t.dueDate,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ tasks: [tmp, ...s.tasks] }));
    persist(async () => {
      const { row } = await send("tasks", "POST", t);
      set((s) => ({ tasks: s.tasks.map((x) => (x.id === tmp.id ? row : x)) }));
    }, get().hydrate);
  },
  updateTask: (id, patch) => {
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
    persist(() => send("tasks", "PATCH", { id, ...patch }), get().hydrate);
  },
  deleteTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    persist(() => send("tasks", "DELETE", undefined, id), get().hydrate);
  },
  toggleTaskDone: (id) => {
    const doneNow = get().tasks.find((t) => t.id === id)?.status === "done";
    const next = { status: doneNow ? "todo" : "done", completedAt: doneNow ? undefined : new Date().toISOString() };
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...next } : t)) }));
    persist(() => send("tasks", "PATCH", { id, ...next }), get().hydrate);
  },

  // ---- notes ----
  addNote: (n) => {
    const tmp: Note = { ...n, id: `tmp-${Date.now()}`, pinned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    set((s) => ({ notes: [tmp, ...s.notes] }));
    persist(async () => {
      const { row } = await send("notes", "POST", n);
      set((s) => ({ notes: s.notes.map((x) => (x.id === tmp.id ? row : x)) }));
    }, get().hydrate);
  },
  updateNote: (id, patch) => {
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n)) }));
    persist(() => send("notes", "PATCH", { id, ...patch }), get().hydrate);
  },
  deleteNote: (id) => {
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
    persist(() => send("notes", "DELETE", undefined, id), get().hydrate);
  },
  togglePin: (id) => {
    const cur = get().notes.find((n) => n.id === id)?.pinned ?? false;
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)) }));
    persist(() => send("notes", "PATCH", { id, pinned: !cur }), get().hydrate);
  },

  // ---- bookmarks ----
  addBookmark: (b) => {
    const tmp: Bookmark = { ...b, id: `tmp-${Date.now()}`, createdAt: new Date().toISOString() };
    set((s) => ({ bookmarks: [tmp, ...s.bookmarks] }));
    persist(async () => {
      const { row } = await send("bookmarks", "POST", b);
      set((s) => ({ bookmarks: s.bookmarks.map((x) => (x.id === tmp.id ? row : x)) }));
    }, get().hydrate);
  },
  updateBookmark: (id, patch) => {
    set((s) => ({ bookmarks: s.bookmarks.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
    persist(() => send("bookmarks", "PATCH", { id, ...patch }), get().hydrate);
  },
  deleteBookmark: (id) => {
    set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.id !== id) }));
    persist(() => send("bookmarks", "DELETE", undefined, id), get().hydrate);
  },

  // ---- transactions ----
  addTx: (x) => {
    const tmp: Transaction = { ...x, id: `tmp-${Date.now()}`, createdAt: new Date().toISOString() };
    set((s) => ({ transactions: [tmp, ...s.transactions] }));
    persist(async () => {
      const { row } = await send("transactions", "POST", x);
      set((s) => ({ transactions: s.transactions.map((y) => (y.id === tmp.id ? row : y)) }));
    }, get().hydrate);
  },
  updateTx: (id, patch) => {
    set((s) => ({ transactions: s.transactions.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    persist(() => send("transactions", "PATCH", { id, ...patch }), get().hydrate);
  },
  deleteTx: (id) => {
    set((s) => ({ transactions: s.transactions.filter((x) => x.id !== id) }));
    persist(() => send("transactions", "DELETE", undefined, id), get().hydrate);
  },

  // ---- events ----
  addEvent: (e) => {
    const tmp: CalEvent = { ...e, id: `tmp-${Date.now()}`, createdAt: new Date().toISOString() };
    set((s) => ({ events: [...s.events, tmp] }));
    persist(async () => {
      const { row } = await send("events", "POST", e);
      set((s) => ({ events: s.events.map((y) => (y.id === tmp.id ? row : y)) }));
    }, get().hydrate);
  },
  updateEvent: (id, patch) => {
    set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
    persist(() => send("events", "PATCH", { id, ...patch }), get().hydrate);
  },
  deleteEvent: (id) => {
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
    persist(() => send("events", "DELETE", undefined, id), get().hydrate);
  },

  clearLocal: () =>
    set({ projects: [], tasks: [], notes: [], bookmarks: [], transactions: [], events: [] }),
}));

// ---- derived helpers ----

export function monthPrefix(): string {
  return new Date().toISOString().slice(0, 7);
}

export interface AlertItem {
  id: string;
  kind: string;
  refId: string;
  title: string;
  meta?: string;
}

export function computeAlerts(data: {
  tasks: Task[]; events: CalEvent[]; transactions: Transaction[]; settings: AppSettings;
}): AlertItem[] {
  const alerts: AlertItem[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const t of data.tasks) {
    if (t.status === "done" || !t.dueDate) continue;
    if (t.dueDate < today) alerts.push({ id: `ov-${t.id}`, kind: "alert_overdue", refId: t.id, title: t.title, meta: t.dueDate });
    else if (t.dueDate === today) alerts.push({ id: `dt-${t.id}`, kind: "alert_dueToday", refId: t.id, title: t.title });
  }

  const horizon = iso(7);
  for (const e of data.events) {
    if (e.date >= today && e.date <= horizon) {
      alerts.push({ id: `ev-${e.id}`, kind: "alert_eventSoon", refId: e.id, title: e.title, meta: e.date });
    }
  }

  const mp = monthPrefix();
  const spent = data.transactions
    .filter((x) => x.type === "expense" && x.date.startsWith(mp))
    .reduce((a, x) => a + x.amount, 0);
  if (data.settings.monthlyBudget > 0 && spent >= data.settings.monthlyBudget * 0.8) {
    alerts.push({ id: "budget", kind: "alert_budget", refId: "", title: "budget" });
  }

  return alerts;
}
