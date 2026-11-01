// MatinDesk — core domain types (v0.1.x — server-backed accounts)
// Account data lives on the server; GitHub Gist backups are opt-in.

export type Locale = "fa" | "en" | "ar";
export type ThemeMode = "light" | "dark";
export type Accent = "emerald" | "teal" | "amber" | "rose" | "violet";
export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TxType = "income" | "expense";

export interface Project {
  id: string;
  name: string;
  color: string; // hex
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string; // ISO date (yyyy-mm-dd)
  createdAt: string;
  completedAt?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  category: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  category: string;
  note?: string;
  date: string; // ISO date
  createdAt: string;
}

export interface CalEvent {
  id: string;
  title: string;
  date: string; // ISO date
  time?: string; // HH:mm
  reminderMinutes?: number; // 0 = none
  note?: string;
  createdAt: string;
}
