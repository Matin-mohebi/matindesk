import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/matin/server/auth";
import { ENTITIES, isEntity, sanitize, type EntityName } from "@/lib/matin/server/entities";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ name: string }> };

function modelOf(name: EntityName) {
  return (db as unknown as Record<string, never>)[ENTITIES[name].model];
}

/** POST /api/entity/tasks — create */
export async function POST(req: NextRequest, ctx: Ctx) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { name } = await ctx.params;
  if (!isEntity(name)) return NextResponse.json({ error: "unknown_entity" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  for (const reqField of ENTITIES[name].required) {
    if (body[reqField] === undefined || body[reqField] === null || body[reqField] === "")
      return NextResponse.json({ error: "missing_field", field: reqField }, { status: 400 });
  }
  const data = sanitize(name, body);
  const row = await (modelOf(name) as any).create({ data: { ...data, userId: user.id } });
  return NextResponse.json({ ok: true, row });
}

/** PATCH /api/entity/tasks — update {id, ...patch} */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { name } = await ctx.params;
  if (!isEntity(name)) return NextResponse.json({ error: "unknown_entity" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const id = body?.id;
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  delete body.id;

  // For projects: verify ownership; for others the userId scoping in updateMany handles it.
  const data = sanitize(name, body);
  const res = await (modelOf(name) as any).updateMany({ where: { id, userId: user.id }, data });
  if (res.count === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const row = await (modelOf(name) as any).findFirst({ where: { id, userId: user.id } });
  return NextResponse.json({ ok: true, row });
}

/** DELETE /api/entity/tasks?id=... */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { name } = await ctx.params;
  if (!isEntity(name)) return NextResponse.json({ error: "unknown_entity" }, { status: 404 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const res = await (modelOf(name) as any).deleteMany({ where: { id, userId: user.id } });
  if (res.count === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
