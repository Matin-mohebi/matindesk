import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, ensureSettings, encryptSecret } from "@/lib/matin/server/auth";

export const runtime = "nodejs";

const GH = "https://api.github.com";

/** GET /api/github — connection status (never exposes the PAT). */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const s = await ensureSettings(user.id);
  return NextResponse.json({
    connected: Boolean(s.githubPat && s.githubLogin),
    login: s.githubLogin ?? null,
    gistId: s.githubGistId ?? null,
    lastBackupAt: s.lastBackupAt?.toISOString() ?? null,
  });
}

/** PUT /api/github {pat} — verify a Personal Access Token and store it encrypted. */
export async function PUT(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const pat = String(body?.pat ?? "").trim();
  if (pat.length < 20) return NextResponse.json({ error: "invalid_pat" }, { status: 400 });

  try {
    const res = await fetch(`${GH}/user`, {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "MatinDesk",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: res.status === 401 ? "bad_token" : "github_unreachable" },
        { status: res.status === 401 ? 401 : 502 }
      );
    }
    const profile = (await res.json()) as { login?: string };
    const scopes = res.headers.get("x-oauth-scopes") ?? "";
    if (scopes && !scopes.split(",").map((s) => s.trim()).includes("gist")) {
      return NextResponse.json({ error: "missing_gist_scope", scopes }, { status: 422 });
    }

    await ensureSettings(user.id);
    await db.userSettings.update({
      where: { userId: user.id },
      data: { githubPat: encryptSecret(pat), githubLogin: profile.login ?? "unknown" },
    });
    return NextResponse.json({ ok: true, login: profile.login, scopes });
  } catch {
    return NextResponse.json({ error: "github_unreachable" }, { status: 502 });
  }
}

/** DELETE /api/github — disconnect (keeps the gist itself on GitHub). */
export async function DELETE() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await db.userSettings.update({
    where: { userId: user.id },
    data: { githubPat: null, githubLogin: null, githubGistId: null, lastBackupAt: null },
  });
  return NextResponse.json({ ok: true });
}
