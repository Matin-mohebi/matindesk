import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, ensureSettings } from "@/lib/matin/server/auth";

export const runtime = "nodejs";

const LOCALES = new Set(["fa", "en", "ar"]);
const THEMES = new Set(["light", "dark"]);
const ACCENTS = new Set(["emerald", "teal", "amber", "rose", "violet"]);
const CURRENCIES = new Set(["IRT", "IRR", "USD", "EUR"]);

/** PATCH /api/settings — update user preferences. */
export async function PATCH(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await ensureSettings(user.id);

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.locale === "string" && LOCALES.has(body.locale)) data.locale = body.locale;
  if (typeof body.theme === "string" && THEMES.has(body.theme)) data.theme = body.theme;
  if (typeof body.accent === "string" && ACCENTS.has(body.accent)) data.accent = body.accent;
  if (typeof body.fontScale === "number")
    data.fontScale = Math.min(1.25, Math.max(0.85, body.fontScale));
  if (typeof body.currency === "string" && CURRENCIES.has(body.currency)) data.currency = body.currency;
  if (typeof body.monthlyBudget === "number")
    data.monthlyBudget = Math.max(0, Math.min(1e15, body.monthlyBudget));

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });

  const settings = await db.userSettings.update({ where: { userId: user.id }, data });
  return NextResponse.json({
    ok: true,
    settings: {
      locale: settings.locale,
      theme: settings.theme,
      accent: settings.accent,
      fontScale: settings.fontScale,
      currency: settings.currency,
      monthlyBudget: settings.monthlyBudget,
    },
  });
}
