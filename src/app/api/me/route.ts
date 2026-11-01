import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, hashPassword, verifyPassword } from "@/lib/matin/server/auth";

export const runtime = "nodejs";

/** GET /api/me — account info + usage counters. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [tasks, notes, transactions, projects, events, bookmarks] = await Promise.all([
    db.task.count({ where: { userId: user.id } }),
    db.note.count({ where: { userId: user.id } }),
    db.transaction.count({ where: { userId: user.id } }),
    db.project.count({ where: { userId: user.id } }),
    db.calEvent.count({ where: { userId: user.id } }),
    db.bookmark.count({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
    counts: { tasks, notes, transactions, projects, events, bookmarks },
  });
}

/** PATCH /api/me — change display name and/or password. */
export async function PATCH(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const data: { name?: string; passwordHash?: string } = {};

  if (typeof body.name === "string") {
    const name = body.name.trim().slice(0, 60);
    if (name.length < 2) return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    data.name = name;
  }

  if (typeof body.currentPassword === "string" && typeof body.newPassword === "string") {
    if (!verifyPassword(body.currentPassword, user.passwordHash))
      return NextResponse.json({ error: "bad_credentials" }, { status: 403 });
    if (body.newPassword.length < 6)
      return NextResponse.json({ error: "weak_password" }, { status: 400 });
    data.passwordHash = hashPassword(body.newPassword);
  }

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });

  const updated = await db.user.update({ where: { id: user.id }, data });
  return NextResponse.json({ ok: true, user: { id: updated.id, email: updated.email, name: updated.name } });
}

/** DELETE /api/me — permanently erase ALL data of the account (keeps login). */
export async function DELETE() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await db.$transaction([
    db.task.deleteMany({ where: { userId: user.id } }),
    db.note.deleteMany({ where: { userId: user.id } }),
    db.bookmark.deleteMany({ where: { userId: user.id } }),
    db.transaction.deleteMany({ where: { userId: user.id } }),
    db.calEvent.deleteMany({ where: { userId: user.id } }),
    db.project.deleteMany({ where: { userId: user.id } }),
  ]);
  return NextResponse.json({ ok: true });
}
