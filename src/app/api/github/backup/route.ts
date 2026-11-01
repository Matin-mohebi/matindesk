import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, getPat, ensureSettings } from "@/lib/matin/server/auth";
import { validateBackup, restoreData } from "@/lib/matin/server/restore";

export const runtime = "nodejs";

const GH = "https://api.github.com";
const FILE_NAME = "matindesk-backup.json";

function ghHeaders(pat: string) {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "MatinDesk",
  };
}

async function exportUserData(userId: string) {
  const [projects, tasks, notes, bookmarks, transactions, events, settings] = await Promise.all([
    db.project.findMany({ where: { userId } }),
    db.task.findMany({ where: { userId } }),
    db.note.findMany({ where: { userId } }),
    db.bookmark.findMany({ where: { userId } }),
    db.transaction.findMany({ where: { userId } }),
    db.calEvent.findMany({ where: { userId } }),
    db.userSettings.findUnique({ where: { userId } }),
  ]);
  return {
    app: "MatinDesk",
    schema: 2,
    exportedAt: new Date().toISOString(),
    settings: {
      locale: settings?.locale ?? "fa",
      theme: settings?.theme ?? "dark",
      accent: settings?.accent ?? "emerald",
      fontScale: settings?.fontScale ?? 1,
      currency: settings?.currency ?? "IRT",
      monthlyBudget: settings?.monthlyBudget ?? 0,
    },
    projects,
    tasks,
    notes,
    bookmarks,
    transactions,
    events,
  };
}

/** POST /api/github/backup — snapshot ALL account data into the user's private GitHub Gist. */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const creds = await getPat(user.id);
  if (!creds) return NextResponse.json({ error: "not_connected" }, { status: 400 });

  const payload = await exportUserData(user.id);
  const content = JSON.stringify(payload, null, 2);
  const gistBody = JSON.stringify({
    description: `MatinDesk backup — ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
    public: false,
    files: { [FILE_NAME]: { content } },
  });

  try {
    let gistId: string;
    if (creds.gistId) {
      const res = await fetch(`${GH}/gists/${creds.gistId}`, {
        method: "PATCH",
        headers: ghHeaders(creds.pat),
        body: gistBody,
        signal: AbortSignal.timeout(20_000),
      });
      if (res.status === 404) {
        // gist was deleted on GitHub — create a new one
        const created = await fetch(`${GH}/gists`, {
          method: "POST",
          headers: ghHeaders(creds.pat),
          body: gistBody,
          signal: AbortSignal.timeout(20_000),
        });
        if (!created.ok) return NextResponse.json({ error: "gist_create_failed", status: created.status }, { status: 502 });
        gistId = ((await created.json()) as { id: string }).id;
      } else if (!res.ok) {
        return NextResponse.json({ error: "gist_update_failed", status: res.status }, { status: 502 });
      } else {
        gistId = creds.gistId;
      }
    } else {
      const created = await fetch(`${GH}/gists`, {
        method: "POST",
        headers: ghHeaders(creds.pat),
        body: gistBody,
        signal: AbortSignal.timeout(20_000),
      });
      if (!created.ok) return NextResponse.json({ error: "gist_create_failed", status: created.status }, { status: 502 });
      gistId = ((await created.json()) as { id: string }).id;
    }

    const lastBackupAt = new Date();
    await ensureSettings(user.id);
    await db.userSettings.update({ where: { userId: user.id }, data: { githubGistId: gistId, lastBackupAt } });

    const kb = Math.max(1, Math.round(content.length / 1024));
    return NextResponse.json({ ok: true, gistId, lastBackupAt: lastBackupAt.toISOString(), sizeKb: kb });
  } catch {
    return NextResponse.json({ error: "github_unreachable" }, { status: 502 });
  }
}

/** GET /api/github/backup — restore the account from the stored Gist. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const creds = await getPat(user.id);
  if (!creds?.gistId) return NextResponse.json({ error: "no_backup" }, { status: 400 });

  try {
    const res = await fetch(`${GH}/gists/${creds.gistId}`, {
      headers: ghHeaders(creds.pat),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return NextResponse.json({ error: "gist_fetch_failed", status: res.status }, { status: 502 });
    const gist = (await res.json()) as { files?: Record<string, { content?: string }> };
    const raw = gist.files?.[FILE_NAME]?.content;
    if (!raw) return NextResponse.json({ error: "no_backup_file" }, { status: 404 });

    const data = JSON.parse(raw);
    if (!validateBackup(data)) return NextResponse.json({ error: "invalid_backup" }, { status: 422 });

    await restoreData(user.id, data);
    return NextResponse.json({
      ok: true,
      restored: {
        tasks: (data.tasks as unknown[]).length,
        notes: (data.notes as unknown[]).length,
        projects: (data.projects as unknown[]).length,
      },
    });
  } catch (e) {
    const msg = e instanceof Error && e.name === "SyntaxError" ? "invalid_backup" : "github_unreachable";
    return NextResponse.json({ error: msg }, { status: msg === "invalid_backup" ? 422 : 502 });
  }
}
