// MatinDesk — validated, transactional restore pipeline.
import { db } from "@/lib/db";

type Row = Record<string, unknown>;
const MAX_ROWS_PER_COLLECTION = 10_000;
const str = (v: unknown, fb = ""): string => (typeof v === "string" ? v.slice(0, 50_000) : fb);
const num = (v: unknown, fb = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : fb);
const dateOrNull = (v: unknown): Date | null => {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const isRowArray = (v: unknown): v is Row[] =>
  Array.isArray(v) && v.length <= MAX_ROWS_PER_COLLECTION && v.every((item) =>
    item !== null && typeof item === "object" && !Array.isArray(item),
  );

export function validateBackup(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const d = data as Record<string, unknown>;
  if (d.app !== undefined && d.app !== "MatinDesk") return false;
  if (d.schema !== undefined && d.schema !== 2) return false;
  return ["projects", "tasks", "notes", "bookmarks", "transactions", "events"].every((key) =>
    d[key] === undefined ? ["bookmarks", "transactions", "events"].includes(key) : isRowArray(d[key]),
  );
}

/** Restores all collections in one transaction; any failure rolls the whole restore back. */
export async function restoreData(userId: string, data: Record<string, unknown>) {
  const projects = (data.projects ?? []) as Row[];
  const tasks = (data.tasks ?? []) as Row[];
  const notes = (data.notes ?? []) as Row[];
  const bookmarks = (data.bookmarks ?? []) as Row[];
  const transactions = (data.transactions ?? []) as Row[];
  const events = (data.events ?? []) as Row[];

  await db.$transaction(async (tx) => {
    await tx.task.deleteMany({ where: { userId } });
    await tx.note.deleteMany({ where: { userId } });
    await tx.bookmark.deleteMany({ where: { userId } });
    await tx.transaction.deleteMany({ where: { userId } });
    await tx.calEvent.deleteMany({ where: { userId } });
    await tx.project.deleteMany({ where: { userId } });

    const projectIdMap = new Map<string, string>();
    for (const raw of projects) {
      const row = await tx.project.create({
        data: { userId, name: str(raw.name, "بدون نام").slice(0, 200), color: str(raw.color, "#10b981") },
      });
      if (typeof raw.id === "string") projectIdMap.set(raw.id, row.id);
    }

    for (const raw of tasks) {
      const oldPid = typeof raw.projectId === "string" ? raw.projectId : null;
      const priority = str(raw.priority);
      const status = str(raw.status);
      await tx.task.create({
        data: {
          userId,
          title: str(raw.title, "بدون عنوان").slice(0, 500),
          description: str(raw.description) || null,
          projectId: oldPid ? projectIdMap.get(oldPid) ?? null : null,
          priority: ["low", "medium", "high", "urgent"].includes(priority) ? priority : "medium",
          status: ["todo", "in_progress", "done"].includes(status) ? status : "todo",
          dueDate: str(raw.dueDate) || null,
          completedAt: dateOrNull(raw.completedAt),
        },
      });
    }

    for (const raw of notes) {
      await tx.note.create({
        data: {
          userId,
          title: str(raw.title, "بدون عنوان").slice(0, 500),
          content: str(raw.content),
          color: str(raw.color, "#10b981"),
          pinned: Boolean(raw.pinned),
        },
      });
    }

    for (const raw of bookmarks) {
      const url = str(raw.url);
      if (!url) continue;
      await tx.bookmark.create({
        data: { userId, title: str(raw.title, url).slice(0, 500), url, category: str(raw.category, "general") },
      });
    }

    for (const raw of transactions) {
      const type = str(raw.type) === "income" ? "income" : "expense";
      await tx.transaction.create({
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

    for (const raw of events) {
      await tx.calEvent.create({
        data: {
          userId,
          title: str(raw.title, "بدون عنوان").slice(0, 500),
          date: str(raw.date, new Date().toISOString().slice(0, 10)),
          time: str(raw.time) || null,
          reminderMinutes: Math.max(0, Math.min(10_080, num(raw.reminderMinutes))),
          note: str(raw.note) || null,
        },
      });
    }
  }, { maxWait: 10_000, timeout: 60_000 });
}
