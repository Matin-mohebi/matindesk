"use client";
// MatinDesk — sign in / sign up screen
import { useState } from "react";
import { Loader2, LayoutDashboard, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useMatin, api } from "@/lib/matin/store";
import { getDict, LOCALES, dirOf } from "@/lib/matin/i18n";
import { toast } from "sonner";

const FEATURES: Record<string, string[]> = {
  fa: [
    "وظایف و پروژه‌ها با اولویت و سررسید",
    "یادداشت‌های رنگی و نشانک‌ها",
    "مدیریت مالی با بودجه ماهانه",
    "تقویم رویدادها و یادآورها",
    "آمار دقیق و داشبورد زنده",
    "بکاپ روی حساب گیت‌هاب شما",
    "نصب روی اندروید و کار آفلاین",
    "فارسی، English، العربية — راست‌چین کامل",
  ],
  en: [
    "Tasks & projects with priorities and due dates",
    "Colorful notes and bookmarks",
    "Finance with monthly budgets",
    "Calendar events and reminders",
    "Accurate live statistics dashboard",
    "Backups to your own GitHub account",
    "Installable on Android, works offline",
    "Persian, English, Arabic — full RTL",
  ],
  ar: [
    "المهام والمشاريع بالأولوية وتواريخ الاستحقاق",
    "ملاحظات ملونة وعلامات مرجعية",
    "إدارة مالية بميزانية شهرية",
    "أحداث التقويم والتنبيهات",
    "إحصاءات دقيقة ولوحة حية",
    "نسخ احتياطي إلى حسابك في غيت هاب",
    "قابل للتثبيت على أندرويد ويعمل دون اتصال",
    "الفارسية والإنجليزية والعربية — دعم RTL كامل",
  ],
};

export default function AuthScreen() {
  const { settings, hydrate, applyLocalSettings } = useMatin();
  const t = getDict(settings.locale);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const dir = dirOf(settings.locale);
  const features = FEATURES[settings.locale] ?? FEATURES.fa;

  function switchLocale(code: string) {
    applyLocalSettings({ locale: code as typeof settings.locale });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        await api("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, name, password }),
        });
        toast.success(t.authCreateTitle + " ✓");
      } else {
        await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
      }
      await hydrate();
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      const map: Record<string, string> = {
        invalid_email: t.err_invalid_email,
        invalid_name: t.err_invalid_name,
        weak_password: t.err_weak_password,
        email_taken: t.err_email_taken,
        bad_credentials: t.err_bad_credentials,
        server_error: t.err_server,
      };
      toast.error(map[code] ?? t.err_server);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir={dir} className="min-h-screen flex flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="relative lg:w-[46%] bg-[oklch(0.17_0.014_170)] text-[oklch(0.93_0.006_150)] overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(60% 50% at 80% 10%, oklch(0.45 0.1 163 / 0.7), transparent), radial-gradient(50% 60% at 10% 90%, oklch(0.4 0.08 195 / 0.6), transparent)",
          }}
          aria-hidden
        />
        <div className="relative h-full flex flex-col p-8 lg:p-12">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary p-2.5 shadow-lg">
              <LayoutDashboard className="size-7 text-primary-foreground" aria-hidden />
            </div>
            <div>
              <div className="text-xl font-bold">MatinDesk</div>
              <div className="text-xs opacity-70">{t.appTagline}</div>
            </div>
          </div>

          <div className="my-auto py-10">
            <h1 className="text-3xl lg:text-4xl font-bold leading-snug">{t.authWelcome}</h1>
            <p className="mt-3 text-sm lg:text-base opacity-80 max-w-md">{t.authSubtitle}</p>
            <ul className="mt-8 grid gap-2.5 max-w-md">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm opacity-90">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-400" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-xs opacity-60 flex flex-wrap items-center gap-2">
            <span>v0.2.0</span>
            <Separator orientation="vertical" className="h-3 bg-white/20" />
            <span>PWA • Android</span>
            <Separator orientation="vertical" className="h-3 bg-white/20" />
            <span>GitHub Sync</span>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-end gap-1 p-4" role="group" aria-label="Language">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => switchLocale(l.code)}
              className={
                "rounded-full px-3 py-1.5 text-xs transition-colors " +
                (settings.locale === l.code
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted")
              }
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm anim-fade-up">
            <h2 className="text-2xl font-bold">
              {mode === "signin" ? t.signIn : t.authCreateTitle}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === "signin" ? t.authSubtitle : t.authCreateSubtitle}
            </p>

            <form onSubmit={submit} className="mt-7 grid gap-4">
              {mode === "signup" && (
                <div className="grid gap-1.5">
                  <Label htmlFor="name">{t.name}</Label>
                  <Input
                    id="name" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder={t.namePh} required minLength={2} autoComplete="name"
                  />
                </div>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="email">{t.email}</Label>
                <Input
                  id="email" type="email" dir="ltr" className="text-start"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required autoComplete="email"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">{t.password}</Label>
                <Input
                  id="password" type="password" dir="ltr" className="text-start"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordHint} required minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </div>

              <Button type="submit" size="lg" disabled={busy} className="mt-1 pulse-ring">
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {busy ? t.working : mode === "signin" ? t.signInCta : t.signUpCta}
              </Button>
            </form>

            <div className="mt-5 text-center text-sm text-muted-foreground">
              {mode === "signin" ? (
                <>
                  {t.noAccount}{" "}
                  <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setMode("signup")}>
                    {t.signUp}
                  </button>
                </>
              ) : (
                <>
                  {t.haveAccount}{" "}
                  <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setMode("signin")}>
                    {t.signIn}
                  </button>
                </>
              )}
            </div>

            <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground/80 max-w-xs mx-auto">
              {t.authDemoNote}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
