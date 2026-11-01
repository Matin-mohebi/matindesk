"use client";
// MatinDesk — notes view: colored sticky cards, pin, full CRUD.
import { useMemo, useState } from "react";
import { StickyNote, Plus, Pencil, Trash2, Pin, PinOff, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState, ConfirmButton } from "./bits";
import { useMatin } from "@/lib/matin/store";
import { getDict } from "@/lib/matin/i18n";
import { fmtDate, NOTE_COLORS } from "@/lib/matin/helpers";
import type { Note } from "@/lib/matin/types";
import { cn } from "@/lib/utils";

export default function NotesView() {
  const { notes, settings, addNote, updateNote, deleteNote, togglePin } = useMatin();
  const t = getDict(settings.locale);
  const [q, setQ] = useState("");
  const [dlg, setDlg] = useState<{ open: boolean; editing: Note | null }>({ open: false, editing: null });
  const [color, setColor] = useState(NOTE_COLORS[0]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return notes;
    return notes.filter((x) => x.title.toLowerCase().includes(n) || x.content.toLowerCase().includes(n));
  }, [notes, q]);

  function openNew() {
    setColor(NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)]);
    setDlg({ open: true, editing: null });
  }
  function openEdit(n: Note) {
    setColor(n.color);
    setDlg({ open: true, editing: n });
  }
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim() || t.untitled;
    const content = String(fd.get("content") ?? "");
    if (dlg.editing) updateNote(dlg.editing.id, { title, content, color });
    else addNote({ title, content, color });
    setDlg({ open: false, editing: null });
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <SearchIcon className="absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="ps-8 h-9" />
        </div>
        <Button size="sm" className="ms-auto h-9" onClick={openNew}>
          <Plus className="size-4" aria-hidden /> {t.newNote}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={StickyNote} title={t.noNotes}
          cta={<Button size="sm" onClick={openNew}><Plus className="size-4" aria-hidden />{t.newNote}</Button>}
        />
      ) : (
        <div className="columns-1 sm:columns-2 xl:columns-3 gap-3 [&>*]:mb-3">
          {filtered.map((note) => (
            <article
              key={note.id}
              className="group break-inside-avoid rounded-xl border bg-card p-3.5 transition-shadow hover:shadow-sm"
              style={{ borderInlineStartWidth: 4, borderInlineStartColor: note.color }}
            >
              <div className="flex items-start gap-2">
                <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{note.title || t.untitled}</h3>
                <button
                  onClick={() => togglePin(note.id)}
                  className={cn("rounded-md p-1 transition-colors", note.pinned ? "text-amber-500" : "text-muted-foreground opacity-0 group-hover:opacity-100")}
                  aria-label={note.pinned ? t.unpin : t.pin}
                >
                  {note.pinned ? <Pin className="size-3.5" aria-hidden /> : <PinOff className="size-3.5" aria-hidden />}
                </button>
              </div>
              {note.content ? (
                <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground line-clamp-6">{note.content}</p>
              ) : (
                <p className="mt-1.5 text-xs italic text-muted-foreground/60">{t.noContent}</p>
              )}
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground num">{t.lastEdited}: {fmtDate(note.updatedAt?.slice(0, 10) ?? note.createdAt.slice(0, 10), settings.locale)}</span>
                <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(note)} aria-label={t.edit}>
                    <Pencil className="size-3" aria-hidden />
                  </Button>
                  <ConfirmButton
                    title={t.confirmDeleteTitle} body={t.confirmDeleteBody}
                    confirmLabel={t.yesDelete} cancelLabel={t.cancel}
                    onConfirm={() => deleteNote(note.id)}
                  >
                    <Button variant="ghost" size="icon" className="size-7 text-destructive" aria-label={t.delete}>
                      <Trash2 className="size-3" aria-hidden />
                    </Button>
                  </ConfirmButton>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={dlg.open} onOpenChange={(o) => !o && setDlg({ open: false, editing: null })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dlg.editing ? t.editNote : t.newNote}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-3.5">
            <div className="grid gap-1.5">
              <Label htmlFor="note-title">{t.noteTitle}</Label>
              <Input id="note-title" name="title" defaultValue={dlg.editing?.title ?? ""} autoFocus />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="note-content">{t.noteContent}</Label>
              <Textarea id="note-content" name="content" rows={7} defaultValue={dlg.editing?.content ?? ""} />
            </div>
            <div className="flex gap-1.5" role="radiogroup" aria-label={t.color}>
              {NOTE_COLORS.map((c) => (
                <button
                  key={c} type="button" role="radio" aria-checked={color === c}
                  onClick={() => setColor(c)}
                  className={cn("size-6 rounded-full border-2 transition-transform", color === c ? "border-foreground scale-110" : "border-transparent")}
                  style={{ background: c }}
                />
              ))}
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
