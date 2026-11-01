import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/matin/server/auth";

export const runtime = "nodejs";

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** GET /api/stats — accurate, server-computed statistics for the dashboard. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const uid = user.id;
  const today = iso(new Date());
  const monthPrefix = today.slice(0, 7);

  const [allTasks, txs, noteCount, bookmarkCount, projectCount, eventCount, settings, lastTasks] =
    await Promise.all([
      db.task.findMany({ where: { userId: uid }, select: { status: true, dueDate: true, completedAt: true, priority: true, projectId: true } }),
      db.transaction.findMany({ where: { userId: uid }, select: { type: true, amount: true, category: true, date: true } }),
      db.note.count({ where: { userId: uid } }),
      db.bookmark.count({ where: { userId: uid } }),
      db.project.count({ where: { userId: uid } }),
      db.calEvent.count({ where: { userId: uid, date: { gte: today } } }),
      db.userSettings.findUnique({ where: { userId: uid } }),
      db.task.findMany({
        where: { userId: uid, status: "done", completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
        take: 1,
        select: { completedAt: true },
      }),
    ]);

  // --- tasks ---
  const tasksByStatus = { todo: 0, in_progress: 0, done: 0 } as Record<string, number>;
  for (const t of allTasks) tasksByStatus[t.status] = (tasksByStatus[t.status] ?? 0) + 1;
  const overdue = allTasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate < today).length;
  const dueToday = allTasks.filter((t) => t.status !== "done" && t.dueDate === today).length;

  // --- 14-day completion trend (accurate from completedAt) ---
  const days: { day: string; done: number }[] = [];
  const byDay = new Map<string, number>();
  for (const t of allTasks) {
    if (t.status === "done" && t.completedAt) {
      const d = iso(t.completedAt);
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }
  }
  for (let i = 13; i >= 0; i--) {
    const d = iso(new Date(Date.now() - i * 86_400_000));
    days.push({ day: d, done: byDay.get(d) ?? 0 });
  }

  // --- streak (consecutive days with ≥1 completed task, ending today or yesterday) ---
  let streak = 0;
  {
    let cursor = new Date();
    if (!byDay.has(iso(cursor))) cursor = new Date(Date.now() - 86_400_000);
    while (byDay.has(iso(cursor))) {
      streak++;
      cursor = new Date(cursor.getTime() - 86_400_000);
    }
  }

  // --- finance (this month) ---
  const monthTx = txs.filter((x) => x.date.startsWith(monthPrefix));
  const income = monthTx.filter((x) => x.type === "income").reduce((a, x) => a + x.amount, 0);
  const expense = monthTx.filter((x) => x.type === "expense").reduce((a, x) => a + x.amount, 0);
  const allTimeIncome = txs.filter((x) => x.type === "income").reduce((a, x) => a + x.amount, 0);
  const allTimeExpense = txs.filter((x) => x.type === "expense").reduce((a, x) => a + x.amount, 0);

  const expByCat = new Map<string, number>();
  for (const x of monthTx) {
    if (x.type === "expense") expByCat.set(x.category, (expByCat.get(x.category) ?? 0) + x.amount);
  }
  const expenseByCategory = [...expByCat.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const budget = settings?.monthlyBudget ?? 0;

  return NextResponse.json({
    tasks: {
      total: allTasks.length,
      ...tasksByStatus,
      overdue,
      dueToday,
      doneThisWeek: days.slice(-7).reduce((a, d) => a + d.done, 0),
      streak,
      lastCompletedAt: lastTasks[0]?.completedAt?.toISOString() ?? null,
    },
    trend: days,
    finance: {
      income,
      expense,
      balance: income - expense,
      budget,
      budgetUsedPct: budget > 0 ? Math.round((expense / budget) * 100) : 0,
      allTimeIncome,
      allTimeExpense,
      txCount: txs.length,
      expenseByCategory,
    },
    counts: { notes: noteCount, bookmarks: bookmarkCount, projects: projectCount, upcomingEvents: eventCount },
    generatedAt: new Date().toISOString(),
  });
}
