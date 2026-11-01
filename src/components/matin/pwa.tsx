"use client";
// MatinDesk — PWA: service-worker registration, install prompt, offline banner.
import { useEffect, useState } from "react";
import { Download, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMatin } from "@/lib/matin/store";
import { getDict } from "@/lib/matin/i18n";
import { toast } from "sonner";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaRegister() {
  const { settings } = useMatin();
  const t = getDict(settings.locale);
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const on = () => { setOnline(true); toast.success(t.backOnline); };
    const off = () => setOnline(false);
    const bip = (e: Event) => { e.preventDefault(); setInstallEvt(e as BIPEvent); };
    const installedHandler = () => { setInstalled(true); setInstallEvt(null); };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("beforeinstallprompt", bip);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", bip);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, [t.backOnline]);

  if (!online) {
    return (
      <div className="fixed bottom-20 md:bottom-4 inset-x-4 md:inset-x-auto md:start-4 z-[60] flex items-center gap-2 rounded-full bg-amber-500/95 px-4 py-2 text-xs font-medium text-amber-950 shadow-lg">
        <WifiOff className="size-3.5" aria-hidden />
        {t.offline}
      </div>
    );
  }

  if (!installEvt) return null;
  return (
    <Button
      size="sm"
      onClick={async () => {
        await installEvt.prompt();
        const { outcome } = await installEvt.userChoice;
        if (outcome === "accepted") setInstallEvt(null);
      }}
      className="fixed bottom-20 md:bottom-4 inset-x-4 md:inset-x-auto md:start-4 z-[60] shadow-lg"
    >
      <Download className="size-4" aria-hidden />
      {t.installApp}
    </Button>
  );
}
