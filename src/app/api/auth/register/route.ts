import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createSession, ensureSettings } from "@/lib/matin/server/auth";
import { seedWorkspace } from "@/lib/matin/server/seed";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const name = String(body?.name ?? "").trim();
    const password = String(body?.password ?? "");

    if (!EMAIL_RE.test(email) || email.length > 190)
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    if (name.length < 2 || name.length > 60)
      return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    if (password.length < 6)
      return NextResponse.json({ error: "weak_password" }, { status: 400 });

    const existing = await db.user.findUnique({ where: { email } });
    if (existing)
      return NextResponse.json({ error: "email_taken" }, { status: 409 });

    const user = await db.user.create({
      data: { email, name, passwordHash: hashPassword(password) },
    });
    await ensureSettings(user.id);
    await seedWorkspace(user.id, name.split(" ")[0] || name);
    await createSession(user.id);

    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) {
    console.error("register error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
