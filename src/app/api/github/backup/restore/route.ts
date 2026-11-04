import { NextResponse } from "next/server";
import { currentUser, getPat } from "@/lib/matin/server/auth";
import { validateBackup, restoreData } from "@/lib/matin/server/restore";

export const runtime = "nodejs";

const GH = "https://api.github.com";
const FILE_NAME = "matindesk-backup.json";

/** POST /api/github/backup/restore — explicitly restore account data from its private Gist. */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const creds = await getPat(user.id);
  if (!creds?.gistId) return NextResponse.json({ error: "no_backup" }, { status: 400 });

  try {
    const res = await fetch(`${GH}/gists/${creds.gistId}`, {
      headers: { Authorization: `Bearer ${creds.pat}`, Accept: "application/vnd.github+json", "User-Agent": "MatinDesk" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return NextResponse.json({ error: "gist_fetch_failed", status: res.status }, { status: 502 });
    const gist = (await res.json()) as { files?: Record<string, { content?: string }> };
    const raw = gist.files?.[FILE_NAME]?.content;
    if (!raw) return NextResponse.json({ error: "no_backup_file" }, { status: 404 });
    if (raw.length > 5 * 1024 * 1024) return NextResponse.json({ error: "backup_too_large" }, { status: 413 });
    const data = JSON.parse(raw);
    if (!validateBackup(data)) return NextResponse.json({ error: "invalid_backup" }, { status: 422 });
    await restoreData(user.id, data);
    return NextResponse.json({ ok: true, restored: {
      tasks: ((data.tasks ?? []) as unknown[]).length,
      notes: ((data.notes ?? []) as unknown[]).length,
      projects: ((data.projects ?? []) as unknown[]).length,
    } });
  } catch (e) {
    const msg = e instanceof Error && e.name === "SyntaxError" ? "invalid_backup" : "github_unreachable";
    return NextResponse.json({ error: msg }, { status: msg === "invalid_backup" ? 422 : 502 });
  }
}
