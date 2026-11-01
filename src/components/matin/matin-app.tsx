"use client";
// MatinDesk — root client component: hydration gate, theme/locale effects, PWA registration.
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useMatin } from "@/lib/matin/store";
import { dirOf, getDict } from "@/lib/matin/i18n";
import AuthScreen from "./auth-screen";
import Shell from "./shell";
import { PwaRegister } from "./pwa";

const ACCENT_VARS: Record<string, string> = {
  emerald: "163",
  teal: "195",
  amber: "70",
  rose: "15",
  violet: "300",
};

export default function MatinApp() {
  const { ready, user, settings, hydrate } = useMatin();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // theme, accent, direction, font scale — applied to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", settings.theme === "dark");
    root.setAttribute("data-accent", settings.accent);
    root.dir = dirOf(settings.locale);
    root.lang = settings.locale;
    root.style.setProperty("--font-scale", String(settings.fontScale));
  }, [settings.theme, settings.accent, settings.locale, settings.fontScale]);

  if (!ready) {
    return (
      <div dir={dirOf(settings.locale)} className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="rounded-2xl bg-primary p-3 shadow-lg pulse-ring">
          <Loader2 className="size-8 animate-spin text-primary-foreground" aria-hidden />
        </div>
        <p className="text-sm text-muted-foreground">{getDict(settings.locale).splashLoading}</p>
      </div>
    );
  }

  if (!user) return <AuthScreen />;
  return (
    <>
      <Shell />
      <PwaRegister />
    </>
  );
}
