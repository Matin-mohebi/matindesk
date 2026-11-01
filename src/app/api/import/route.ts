import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/matin/server/auth";
import { validateBackup, restoreData } from "@/lib/matin/server/restore";

export const runtime = "nodejs";

/** POST /api/import — replace account content with a MatinDesk backup file. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!validateBackup(data)) return NextResponse.json({ error: "invalid_backup" }, { status: 400 });

  await restoreData(user.id, data);
  return NextResponse.json({
    ok: true,
    imported: {
      tasks: (data.tasks as unknown[]).length,
      notes: (data.notes as unknown[]).length,
      projects: (data.projects as unknown[]).length,
    },
  });
}
