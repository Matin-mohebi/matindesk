import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/matin/server/auth";

export const runtime = "nodejs";

/** GET /api/search?q=... — server-side global search across all user content. */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });
  const needle = q.slice(0, 80);
  const contains = { contains: needle };

  const [tasks, notes, bookmarks, events, transactions] = await Promise.all([
    db.task.findMany({ where: { userId: user.id, OR: [{ title: contains }, { description: contains }] }, take: 8, orderBy: { createdAt: "desc" } }),
    db.note.findMany({ where: { userId: user.id, OR: [{ title: contains }, { content: contains }] }, take: 8, orderBy: { updatedAt: "desc" } }),
    db.bookmark.findMany({ where: { userId: user.id, OR: [{ title: contains }, { url: contains }] }, take: 6, orderBy: { createdAt: "desc" } }),
    db.calEvent.findMany({ where: { userId: user.id, title: contains }, take: 6, orderBy: { date: "asc" } }),
    db.transaction.findMany({ where: { userId: user.id, OR: [{ note: contains }, { category: contains }] }, take: 6, orderBy: { date: "desc" } }),
  ]);

  return NextResponse.json({
    results: { tasks, notes, bookmarks, events, transactions },
    query: needle,
  });
}
