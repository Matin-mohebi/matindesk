// MatinDesk — shared restore pipeline (used by file import and GitHub gist restore).
import { db } from "@/lib/db";

type Row = Record<string, unknown>;

const str = (v: unknown, fb = ""): string => (typeof v === "string" ? v.slice(0, 50_000) : fb);
const num = (v: unknown, fb = 0): number => (typeof v === "number" && isFinite(v) ? v : fb);
const dateOrNull = (v: unknown): Date | null => {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

export function validateBackup(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return Array.isArray(d.tasks) && Array.isArray(d.notes) && Array.isArray(d.projects);
}

/** Wipes the user's content and restores it from a parsed backup object. */
export async function restoreData(userId: string, data: Record<string, unknown>) {
  await db.$transaction([
    db.task.deleteMany({ where: { userId } }),
    db.note.deleteMany({ where: { userId } }),
    db.bookmark.deleteMany({ where: { userId } }),
    db.transaction.deleteMany({ where: { userId } }),
    db.calEvent.deleteMany({ where: { userId } }),
    db.project.deleteMany({ where: { userId } }),
  ]);

  const projectIdMap = new Map<string, string>();
  for (const raw of data.projects as Row[]) {
    const row = await db.project.create({
      data: { userId, name: str(raw.name, "بدون نام").slice(0, 200), color: str(raw.color, "#10b981") },
    });
    if (typeof raw.id === "string") projectIdMap.set(raw.id, row.id);
  }

  for (const raw of data.tasks as Row[]) {
    const oldPid = typeof raw.projectId === "string" ? raw.projectId : null;
    const status = str(raw.status);
    await db.task.create({
      data: {
        userId,
        title: str(raw.title, "بدون عنوان").slice(0, 500),
        description: str(raw.description) || null,
        projectId: oldPid ? projectIdMap.get(oldPid) ?? null : null,
        priority: ["low", "medium", "high", "urgent"].includes(str(raw.priority)) ? str(raw.priority) : "medium",
        status: ["todo", "in_progress", "done"].includes(status) ? status : "todo",
        dueDate: str(raw.dueDate) || null,
        completedAt: dateOrNull(raw.completedAt),
      },
    });
  }

  for (const raw of data.notes as Row[]) {
    await db.note.create({
      data: {
        userId,
        title: str(raw.title, "بدون عنوان").slice(0, 500),
        content: str(raw.content),
        color: str(raw.color, "#10b981"),
        pinned: Boolean(raw.pinned),
      },
    });
  }

  for (const raw of data.bookmarks as Row[]) {
    const url = str(raw.url);
    if (!url) continue;
    await db.bookmark.create({
      data: { userId, title: str(raw.title, url).slice(0, 500), url, category: str(raw.category, "general") },
    });
  }

  for (const raw of data.transactions as Row[]) {
    const type = str(raw.type) === "income" ? "income" : "expense";
    await db.transaction.create({
      data: {
        userId,
        type,
        amount: Math.max(0, num(raw.amount)),
        category: str(raw.category, type === "income" ? "inc_other" : "exp_other"),
        note: str(raw.note) || null,
        date: str(raw.date, new Date().toISOString().slice(0, 10)),
      },
    });
  }

  for (const raw of data.events as Row[]) {
    await db.calEvent.create({
      data: {
        userId,
        title: str(raw.title, "بدون عنوان").slice(0, 500),
        date: str(raw.date, new Date().toISOString().slice(0, 10)),
        time: str(raw.time) || null,
        reminderMinutes: Math.max(0, num(raw.reminderMinutes)),
        note: str(raw.note) || null,
      },
    });
  }
}
