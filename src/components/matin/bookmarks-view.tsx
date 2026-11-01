"use client";
// MatinDesk — bookmarks view: categorized links with quick open.
import { useMemo, useState } from "react";
import { Bookmark, Plus, Pencil, Trash2, ExternalLink, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState, ConfirmButton } from "./bits";
import { useMatin } from "@/lib/matin/store";
import { getDict } from "@/lib/matin/i18n";
import { hostOf, normalizeUrl, hashColor } from "@/lib/matin/helpers";
import type { Bookmark as BM } from "@/lib/matin/types";
import { cn } from "@/lib/utils";

const CATS = ["general", "work", "learning", "tools", "social", "fun"] as const;

export default function BookmarksView() {
  const { bookmarks, settings, addBookmark, updateBookmark, deleteBookmark } = useMatin();
  const t = getDict(settings.locale);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [dlg, setDlg] = useState<{ open: boolean; editing: BM | null }>({ open: false, editing: null });
  const [category, setCategory] = useState<string>("general");

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return bookmarks.filter((b) => {
      if (cat !== "all" && b.category !== cat) return false;
      if (n && !(b.title.toLowerCase().includes(n) || b.url.toLowerCase().includes(n))) return false;
      return true;
    });
  }, [bookmarks, q, cat]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    const url = normalizeUrl(String(fd.get("url") ?? "").trim());
    if (!title || !url) return;
    if (dlg.editing) updateBookmark(dlg.editing.id, { title, url, category });
    else addBookmark({ title, url, category });
    setDlg({ open: false, editing: null });
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-40 max-w-xs">
          <SearchIcon className="absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="ps-8 h-9" />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="h-9 w-32" aria-label={t.category}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.all}</SelectItem>
            {CATS.map((c) => (
              <SelectItem key={c} value={c}>{t[`cat_${c}` as keyof typeof t] as string}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="ms-auto h-9" onClick={() => { setCategory("general"); setDlg({ open: true, editing: null }); }}>
          <Plus className="size-4" aria-hidden /> {t.add}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Bookmark} title={t.noBookmarks}
          cta={<Button size="sm" onClick={() => setDlg({ open: true, editing: null })}><Plus className="size-4" aria-hidden />{t.add}</Button>}
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((b) => (
            <article key={b.id} className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-shadow hover:shadow-sm">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ background: hashColor(b.category) }}
                aria-hidden
              >
                {(b.title || hostOf(b.url)).slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{b.title}</div>
                <div dir="ltr" className="truncate text-[11px] text-muted-foreground text-start">{hostOf(b.url)}</div>
              </div>
              <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] shrink-0">
                {t[`cat_${b.category as typeof CATS[number]}` as keyof typeof t] as string ?? b.category}
              </Badge>
              <div className="flex items-center gap-0.5 shrink-0">
                <a
                  href={normalizeUrl(b.url)} target="_blank" rel="noreferrer"
                  className="rounded-md p-1.5 text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                  aria-label={t.visit} title={t.visit}
                >
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
                <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100" onClick={() => { setCategory(b.category); setDlg({ open: true, editing: b }); }} aria-label={t.edit}>
                  <Pencil className="size-3" aria-hidden />
                </Button>
                <ConfirmButton
                  title={t.confirmDeleteTitle} body={t.confirmDeleteBody}
                  confirmLabel={t.yesDelete} cancelLabel={t.cancel}
                  onConfirm={() => deleteBookmark(b.id)}
                >
                  <Button variant="ghost" size="icon" className={cn("size-7 text-destructive opacity-0 group-hover:opacity-100")} aria-label={t.delete}>
                    <Trash2 className="size-3" aria-hidden />
                  </Button>
                </ConfirmButton>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={dlg.open} onOpenChange={(o) => !o && setDlg({ open: false, editing: null })}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{dlg.editing ? t.editBookmark : t.add}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-3.5">
            <div className="grid gap-1.5">
              <Label htmlFor="bm-title">{t.bookmarkTitle}</Label>
              <Input id="bm-title" name="title" defaultValue={dlg.editing?.title ?? ""} required autoFocus />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bm-url">{t.url}</Label>
              <Input id="bm-url" name="url" dir="ltr" className="text-start" defaultValue={dlg.editing?.url ?? ""} placeholder="https://…" required />
            </div>
            <div className="grid gap-1.5">
              <Label>{t.category}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATS.map((c) => (
                    <SelectItem key={c} value={c}>{t[`cat_${c}` as keyof typeof t] as string}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDlg({ open: false, editing: null })}>{t.cancel}</Button>
              <Button type="submit">{t.save}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
