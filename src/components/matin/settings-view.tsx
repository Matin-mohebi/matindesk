"use client";
// MatinDesk — settings: profile, appearance, GitHub sync, data & backup, about.
import { useEffect, useRef, useState } from "react";
import {
  User, Palette, Github, Database, Info, Loader2, CloudUpload, CloudDownload,
  CheckCircle2, Link2, Unlink, RefreshCw, Download, Upload, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ConfirmButton } from "./bits";
import { useMatin, api, defaultSettings } from "@/lib/matin/store";
import { getDict, LOCALES } from "@/lib/matin/i18n";
import { download, fmtDate } from "@/lib/matin/helpers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const APP_VERSION = "0.2.0";
const UPDATE_REPO = process.env.NEXT_PUBLIC_UPDATE_REPO || "matindesk/matindesk";

const ACCENTS: { key: string; hex: string }[] = [
  { key: "emerald", hex: "#10b981" },
  { key: "teal", hex: "#14b8a6" },
  { key: "amber", hex: "#f59e0b" },
  { key: "rose", hex: "#f43f5e" },
  { key: "violet", hex: "#8b5cf6" },
];

export default function SettingsView() {
  const { user, settings, setSettings, clearLocal, hydrate } = useMatin();
  const t = getDict(settings.locale);

  // profile
  const [name, setName] = useState(user?.name ?? "");
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busyPw, setBusyPw] = useState(false);

  // github
  const [gh, setGh] = useState<{ connected: boolean; login: string | null; gistId: string | null; lastBackupAt: string | null }>({ connected: false, login: null, gistId: null, lastBackupAt: null });
  const [pat, setPat] = useState("");
  const [ghBusy, setGhBusy] = useState<"connect" | "backup" | "restore" | null>(null);

  // update
  const [updateState, setUpdateState] = useState<"idle" | "checking" | "latest" | "available" | "error">("idle");
  const [latestTag, setLatestTag] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<typeof gh>("/api/github").then(setGh).catch(() => {});
  }, []);

  async function saveProfile() {
    try {
      await api("/api/me", { method: "PATCH", body: JSON.stringify({ name }) });
      toast.success(t.profileSaved);
      hydrate();
    } catch (e) {
      toast.error(((e as { code?: string }).code === "invalid_name" ? t.err_invalid_name : t.err_server));
    }
  }

  async function changePassword() {
    if (!curPw || !newPw) return;
    setBusyPw(true);
    try {
      await api("/api/me", { method: "PATCH", body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }) });
      toast.success(t.passwordChanged);
      setCurPw(""); setNewPw("");
    } catch (e) {
      const code = (e as { code?: string }).code;
      toast.error(code === "bad_credentials" ? t.err_bad_credentials : code === "weak_password" ? t.err_weak_password : t.err_server);
    } finally {
      setBusyPw(false);
    }
  }

  async function connectGh() {
    if (pat.trim().length < 20) { toast.error(t.err_weak_password); return; }
    setGhBusy("connect");
    try {
      const res = await api<{ login: string }>("/api/github", { method: "PUT", body: JSON.stringify({ pat: pat.trim() }) });
      setGh((s) => ({ ...s, connected: true, login: res.login }));
      setPat("");
      toast.success(`${t.gh_connected} — ${res.login}`);
    } catch (e) {
      const code = (e as { code?: string }).code;
      toast.error(code === "bad_token" ? t.gh_err_bad_token : code === "missing_gist_scope" ? t.gh_err_scope : t.gh_err_unreachable);
    } finally {
      setGhBusy(null);
    }
  }

  async function backupGh() {
    setGhBusy("backup");
    try {
      const res = await api<{ sizeKb: number }>("/api/github/backup", { method: "POST" });
      setGh((s) => ({ ...s, connected: true, lastBackupAt: new Date().toISOString(), gistId: s.gistId ?? "saved" }));
      toast.success(`${t.gh_backupOk} (${res.sizeKb} KB)`);
    } catch (e) {
      const code = (e as { code?: string }).code;
      toast.error(code === "not_connected" ? t.gh_err_not_connected : t.gh_err_unreachable);
    } finally {
      setGhBusy(null);
    }
  }

  async function restoreGh() {
    setGhBusy("restore");
    try {
      await api("/api/github/backup");
      await hydrate();
      toast.success(t.gh_restoreOk);
    } catch (e) {
      const code = (e as { code?: string }).code;
      toast.error(code === "no_backup" ? t.gh_noBackup : t.gh_err_unreachable);
    } finally {
      setGhBusy(null);
    }
  }

  async function disconnectGh() {
    await api("/api/github", { method: "DELETE" }).catch(() => {});
    setGh({ connected: false, login: null, gistId: null, lastBackupAt: null });
    toast.success(t.gh_disconnect + " ✓");
  }

  function exportJSON() {
    const data = {
      app: "MatinDesk", schema: 2, exportedAt: new Date().toISOString(),
      settings: {
        locale: settings.locale, theme: settings.theme, accent: settings.accent,
        fontScale: settings.fontScale, currency: settings.currency, monthlyBudget: settings.monthlyBudget,
      },
      ...useMatin.getState(),
    };
    // strip action functions from store snapshot
    const clean: Record<string, unknown> = { app: data.app, schema: data.schema, exportedAt: data.exportedAt, settings: data.settings };
    for (const key of ["projects", "tasks", "notes", "bookmarks", "transactions", "events"] as const) {
      clean[key] = (data as unknown as Record<string, unknown>)[key];
    }
    download(`matindesk-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(clean, null, 2));
    toast.success(t.exportSuccess);
  }

  async function importJSON(file: File) {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await api("/api/import", { method: "POST", body: JSON.stringify(json) });
      await hydrate();
      toast.success(t.importSuccess);
    } catch {
      toast.error(t.importError);
    }
  }

  async function eraseAll() {
    await api("/api/me", { method: "DELETE" });
    clearLocal();
    toast.success(t.resetDone);
  }

  async function checkUpdate() {
    setUpdateState("checking");
    try {
      const res = await fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases/latest`, {
        headers: { Accept: "application/vnd.github+json" },
        signal: AbortSignal.timeout(10_000),
      });
      if (res.status === 404) { setUpdateState("error"); return; }
      const data = await res.json();
      const tag = String(data.tag_name ?? "");
      setLatestTag(tag);
      setUpdateState(tag.replace(/^v/, "") > APP_VERSION ? "available" : "latest");
    } catch {
      setUpdateState("error");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ---------- profile ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><User className="size-4 text-primary" aria-hidden /> {t.sec_profile}</CardTitle>
          <CardDescription dir="ltr" className="text-start">{user?.email}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-end gap-2">
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="set-name">{t.yourName}</Label>
              <Input id="set-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button size="sm" onClick={saveProfile} disabled={name === user?.name || name.trim().length < 2}>{t.save}</Button>
          </div>
          <Separator />
          <div className="grid gap-2">
            <Label>{t.changePassword}</Label>
            <Input type="password" dir="ltr" className="text-start" placeholder={t.currentPassword} value={curPw} onChange={(e) => setCurPw(e.target.value)} autoComplete="current-password" />
            <Input type="password" dir="ltr" className="text-start" placeholder={t.newPassword + " — " + t.passwordHint} value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" />
            <Button size="sm" variant="outline" onClick={changePassword} disabled={busyPw || !curPw || newPw.length < 6}>
              {busyPw ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} {t.changePassword}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ---------- appearance ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Palette className="size-4 text-primary" aria-hidden /> {t.sec_appearance}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{t.appName}</Label>
              <Select value={settings.locale} onValueChange={(v) => setSettings({ locale: v as typeof settings.locale })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOCALES.map((l) => <SelectItem key={l.code} value={l.code}>{l.label} ({l.dir.toUpperCase()})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{t.theme}</Label>
              <div className="flex rounded-lg border p-1" role="radiogroup" aria-label={t.theme}>
                {([["light", t.th_light], ["dark", t.th_dark]] as const).map(([v, label]) => (
                  <button
                    key={v} role="radio" aria-checked={settings.theme === v}
                    onClick={() => setSettings({ theme: v })}
                    className={cn(
                      "flex-1 rounded-md py-1.5 text-xs font-medium transition-colors",
                      settings.theme === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>{t.accentColor}</Label>
            <div className="flex gap-2" role="radiogroup" aria-label={t.accentColor}>
              {ACCENTS.map((a) => (
                <button
                  key={a.key} role="radio" aria-checked={settings.accent === a.key} aria-label={a.key}
                  onClick={() => setSettings({ accent: a.key as typeof settings.accent })}
                  className={cn(
                    "size-8 rounded-full border-2 transition-transform hover:scale-105",
                    settings.accent === a.key ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ background: a.hex }}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label>{t.fontSize}</Label>
              <span className="num text-xs text-muted-foreground">{Math.round(settings.fontScale * 100)}٪</span>
            </div>
            <Slider
              value={[settings.fontScale]}
              onValueChange={([v]) => useMatin.getState().applyLocalSettings({ fontScale: v })}
              onValueCommit={([v]) => setSettings({ fontScale: v })}
              min={0.85} max={1.25} step={0.05}
              aria-label={t.fontSize}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">{t.offlineBadge}</div>
              <div className="text-[11px] text-muted-foreground">PWA · {t.installApp}</div>
            </div>
            <Switch checked disabled aria-label={t.installDone} />
          </div>
        </CardContent>
      </Card>

      {/* ---------- GitHub sync ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Github className="size-4 text-primary" aria-hidden /> {t.gh_title}
            {gh.connected && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{t.gh_connected}</span>}
          </CardTitle>
          <CardDescription>{t.gh_desc}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3.5">
          {!gh.connected ? (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="gh-pat">{t.gh_pat}</Label>
                <div className="flex gap-2">
                  <Input
                    id="gh-pat" dir="ltr" className="text-start font-mono text-xs"
                    type="password" placeholder={t.gh_pat_ph}
                    value={pat} onChange={(e) => setPat(e.target.value)}
                    autoComplete="off"
                  />
                  <Button size="sm" onClick={connectGh} disabled={ghBusy === "connect" || pat.trim().length < 20}>
                    {ghBusy === "connect" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
                    {t.gh_verify}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">{t.gh_pat_hint}</p>
              </div>
              <details className="rounded-lg border bg-muted/40 p-3 text-xs">
                <summary className="cursor-pointer font-medium">{t.gh_how_title}</summary>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-muted-foreground">{t.gh_how_steps}</pre>
              </details>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5 rounded-lg border bg-muted/40 p-3">
                <CheckCircle2 className="size-5 text-emerald-500" aria-hidden />
                <div className="flex-1 text-sm">
                  {t.gh_connected_as}: <b dir="ltr" className="font-mono text-xs">{gh.login}</b>
                  <div className="text-[10px] text-muted-foreground">
                    {t.gh_lastBackup}: {gh.lastBackupAt ? fmtDate(gh.lastBackupAt.slice(0, 10), settings.locale) : t.never}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={backupGh} disabled={ghBusy !== null}>
                  {ghBusy === "backup" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CloudUpload className="size-4" aria-hidden />}
                  {ghBusy === "backup" ? t.gh_backuping : t.gh_backup_now}
                </Button>
                <Button variant="outline" onClick={restoreGh} disabled={ghBusy !== null}>
                  {ghBusy === "restore" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CloudDownload className="size-4" aria-hidden />}
                  {t.gh_restore}
                </Button>
              </div>
              <ConfirmButton
                title={t.gh_disconnect} body={t.gh_pat_hint}
                confirmLabel={t.gh_disconnect} cancelLabel={t.cancel}
                onConfirm={disconnectGh}
              >
                <Button variant="ghost" size="sm" className="text-destructive w-full">
                  <Unlink className="size-4" aria-hidden /> {t.gh_disconnect}
                </Button>
              </ConfirmButton>
              <p className="text-[10px] text-muted-foreground">{t.gh_gist_note}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* ---------- data ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Database className="size-4 text-primary" aria-hidden /> {t.sec_data}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3.5">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Download className="size-4 text-muted-foreground" aria-hidden />
            <div className="flex-1">
              <div className="text-sm font-medium">{t.exportData}</div>
              <div className="text-[11px] text-muted-foreground">{t.exportDesc}</div>
            </div>
            <Button size="sm" variant="outline" onClick={exportJSON}>JSON</Button>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Upload className="size-4 text-muted-foreground" aria-hidden />
            <div className="flex-1">
              <div className="text-sm font-medium">{t.importData}</div>
              <div className="text-[11px] text-muted-foreground">{t.importDesc}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>JSON</Button>
            <input
              ref={fileRef}
              type="file" accept="application/json,.json" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importJSON(f); e.target.value = ""; }}
            />
          </div>
          <ConfirmButton
            title={t.eraseAllServer} body={t.eraseAllServerWarn}
            confirmLabel={t.yesDelete} cancelLabel={t.cancel}
            onConfirm={eraseAll}
          >
            <Button variant="ghost" size="sm" className="text-destructive w-full">
              <Trash2 className="size-4" aria-hidden /> {t.eraseAllServer}
            </Button>
          </ConfirmButton>
          <p className="text-[10px] text-muted-foreground">{t.resetWarn}</p>
        </CardContent>
      </Card>

      {/* ---------- about ---------- */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Info className="size-4 text-primary" aria-hidden /> {t.sec_about}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-muted px-2.5 py-1 num">{t.version} {APP_VERSION}</span>
            <span className="rounded-full bg-muted px-2.5 py-1">Web · Android (PWA)</span>
            <span className="rounded-full bg-muted px-2.5 py-1">fa · en · ar — RTL/LTR</span>
            <span className="rounded-full bg-muted px-2.5 py-1">GitHub Sync</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={checkUpdate} disabled={updateState === "checking"}>
              {updateState === "checking" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
              {t.checkUpdate}
            </Button>
            {updateState === "latest" && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-3.5" aria-hidden />{t.upToDate}</span>
            )}
            {updateState === "available" && (
              <a
                href={`https://github.com/${UPDATE_REPO}/releases/latest`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                {t.newVersion} ({latestTag}) — {t.updateFromGitHub}
              </a>
            )}
            {updateState === "error" && <span className="text-xs text-muted-foreground">{t.repoNotPublished}</span>}
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">{t.roadmapNote}</p>
          <p className="text-[10px] text-muted-foreground/70">{defaultSettings.locale === "fa" ? "ساخته‌شده با Next.js + SQLite + Prisma" : "Built with Next.js + SQLite + Prisma"}</p>
        </CardContent>
      </Card>
    </div>
  );
}
