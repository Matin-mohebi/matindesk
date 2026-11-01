import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, ensureSettings } from "@/lib/matin/server/auth";

export const runtime = "nodejs";

/** GET /api/data — one-shot hydration payload for the client store. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await ensureSettings(user.id);

  const [projects, tasks, notes, bookmarks, transactions, events, settings] =
    await Promise.all([
      db.project.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
      db.task.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
      db.note.findMany({ where: { userId: user.id }, orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }] }),
      db.bookmark.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
      db.transaction.findMany({ where: { userId: user.id }, orderBy: { date: "desc" } }),
      db.calEvent.findMany({ where: { userId: user.id }, orderBy: { date: "asc" } }),
      db.userSettings.findUnique({ where: { userId: user.id } }),
    ]);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
    settings: {
      locale: settings?.locale ?? "fa",
      theme: settings?.theme ?? "dark",
      accent: settings?.accent ?? "emerald",
      fontScale: settings?.fontScale ?? 1,
      currency: settings?.currency ?? "IRT",
      monthlyBudget: settings?.monthlyBudget ?? 0,
      githubLogin: settings?.githubLogin ?? null,
      lastBackupAt: settings?.lastBackupAt?.toISOString() ?? null,
    },
    projects,
    tasks,
    notes,
    bookmarks,
    transactions,
    events,
  });
}
