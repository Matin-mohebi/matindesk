"use client";
// MatinDesk — tasks & projects view: filters, project manager, full CRUD.
import { useMemo, useState } from "react";
import {
  ListTodo, Plus, Pencil, Trash2, CircleCheck, RotateCcw, FolderKanban,
  Search as SearchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState, ConfirmButton, PrioBadge, StatusBadge, Dot } from "./bits";
import { useMatin } from "@/lib/matin/store";
import { getDict } from "@/lib/matin/i18n";
import { fmtRelative, todayISO, PROJECT_COLORS } from "@/lib/matin/helpers";
import type { Task, Priority, TaskStatus } from "@/lib/matin/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Filter = "all" | "today" | "upcoming" | "overdue" | "done";

export default function TasksView() {
  const { tasks, projects, settings, addTask, updateTask, deleteTask, toggleTaskDone, addProject, updateProject, deleteProject } = useMatin();
  const t = getDict(settings.locale);
  const today = todayISO();

  const [filter, setFilter] = useState<Filter>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  const [taskDialog, setTaskDialog] = useState<{ open: boolean; editing: Task | null }>({ open: false, editing: null });
  const [projDialog, setProjDialog] = useState(false);
  const [editProj, setEditProj] = useState<{ id?: string; name: string; color: string }>({ name: "", color: PROJECT_COLORS[0] });

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return tasks.filter((x) => {
      if (projectFilter !== "all" && (x.projectId ?? "none") !== projectFilter) return false;
      if (n && !(x.title.toLowerCase().includes(n) || (x.description ?? "").toLowerCase().includes(n))) return false;
      if (filter === "done") return x.status === "done";
      if (x.status === "done") return false;
      if (filter === "today") return x.dueDate === today;
      if (filter === "upcoming") return !!x.dueDate && x.dueDate > today;
      if (filter === "overdue") return !!x.dueDate && x.dueDate < today;
      return true;
    });
  }, [tasks, filter, projectFilter, q, today]);

  const filters: { key: Filter; label: string; count?: number }[] = [
    { key: "all", label: t.filter_all, count: tasks.filter((x) => x.status !== "done").length },
    { key: "today", label: t.filter_today, count: tasks.filter((x) => x.status !== "done" && x.dueDate === today).length },
    { key: "upcoming", label: t.filter_upcoming, count: tasks.filter((x) => x.status !== "done" && x.dueDate && x.dueDate > today).length },
    { key: "overdue", label: t.filter_overdue, count: tasks.filter((x) => x.status !== "done" && x.dueDate && x.dueDate < today).length },
    { key: "done", label: t.filter_done, count: tasks.filter((x) => x.status === "done").length },
  ];

  function submitTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    if (!title) return;
    const values = {
      title,
      description: String(fd.get("description") ?? "").trim() || undefined,
      projectId: (String(fd.get("projectId")) || "none") === "none" ? undefined : String(fd.get("projectId")),
      priority: String(fd.get("priority")) as Priority,
      dueDate: String(fd.get("dueDate") ?? "") || undefined,
    };
    if (taskDialog.editing) {
      updateTask(taskDialog.editing.id, values);
      toast.success(t.profileSaved);
    } else {
      addTask(values);
    }
    setTaskDialog({ open: false, editing: null });
  }

  function submitProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = editProj.name.trim();
    if (!name) return;
    if (editProj.id) updateProject(editProj.id, { name, color: editProj.color });
    else addProject(name, editProj.color);
    setProjDialog(false);
    setEditProj({ name: "", color: PROJECT_COLORS[0] });
  }

  return (
    <div className="grid gap-4">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-40 max-w-xs">
          <SearchIcon className="absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="ps-8 h-9" />
        </div>

        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="h-9 w-36" aria-label={t.project}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.filter_all}</SelectItem>
            <SelectItem value="none">{t.noProject}</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex items-center gap-2"><Dot color={p.color} />{p.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ms-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={() => { setEditProj({ name: "", color: PROJECT_COLORS[0] }); setProjDialog(true); }}>
            <FolderKanban className="size-4" aria-hidden /> {t.manageProjects}
          </Button>
          <Button size="sm" className="h-9" onClick={() => setTaskDialog({ open: true, editing: null })}>
            <Plus className="size-4" aria-hidden /> {t.newTask}
          </Button>
        </div>
      </div>

      {/* filter chips */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t.filter_all}>
        {filters.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
            {typeof f.count === "number" && <span className="num ms-1 opacity-70">({fmtLocal(f.count, settings.locale)})</span>}
          </button>
        ))}
      </div>

      {/* list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={t.noTasks}
          cta={<Button size="sm" onClick={() => setTaskDialog({ open: true, editing: null })}><Plus className="size-4" aria-hidden />{t.newTask}</Button>}
        />
      ) : (
        <ul className="grid gap-2">
          {filtered.map((task) => {
            const project = projects.find((p) => p.id === task.projectId);
            const isOverdue = task.status !== "done" && task.dueDate && task.dueDate < today;
            return (
              <li key={task.id} className="group rounded-xl border bg-card p-3 flex items-start gap-3 transition-shadow hover:shadow-sm">
                <Checkbox
                  checked={task.status === "done"}
                  onCheckedChange={() => toggleTaskDone(task.id)}
                  aria-label={task.status === "done" ? t.reopen : t.markDone}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className={cn("text-sm font-medium leading-snug", task.status === "done" && "line-through text-muted-foreground")}>
                    {task.title}
                  </div>
                  {task.description ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{task.description}</p> : null}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={task.status as TaskStatus} t={t} />
                    <PrioBadge priority={task.priority as Priority} t={t} />
                    {project && (
                      <Badge variant="outline" className="gap-1 text-[10px] px-1.5">
                        <Dot color={project.color} /> {project.name}
                      </Badge>
                    )}
                    {task.dueDate && (
                      <Badge variant="outline" className={"text-[10px] px-1.5 num" + (isOverdue ? " border-rose-400/50 text-rose-600 dark:text-rose-400" : "")}>
                        {fmtRelative(task.dueDate, settings.locale, t)}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                  {task.status === "in_progress" ? (
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => updateTask(task.id, { status: "todo" })} aria-label={t.status_todo}>
                      <RotateCcw className="size-3.5" aria-hidden />
                    </Button>
                  ) : task.status === "todo" ? (
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => updateTask(task.id, { status: "in_progress" })} aria-label={t.status_in_progress}>
                      <CircleCheck className="size-3.5 text-amber-500" aria-hidden />
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setTaskDialog({ open: true, editing: task })} aria-label={t.edit}>
                    <Pencil className="size-3.5" aria-hidden />
                  </Button>
                  <ConfirmButton
                    title={t.confirmDeleteTitle} body={t.confirmDeleteBody}
                    confirmLabel={t.yesDelete} cancelLabel={t.cancel}
                    onConfirm={() => deleteTask(task.id)}
                  >
                    <Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label={t.delete}>
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </ConfirmButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* task dialog */}
      <Dialog open={taskDialog.open} onOpenChange={(o) => !o && setTaskDialog({ open: false, editing: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{taskDialog.editing ? t.editTask : t.newTask}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitTask} className="grid gap-3.5">
            <div className="grid gap-1.5">
              <Label htmlFor="task-title">{t.taskTitle}</Label>
              <Input id="task-title" name="title" defaultValue={taskDialog.editing?.title} required autoFocus />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="task-desc">{t.taskDesc} <span className="text-muted-foreground">({t.optional})</span></Label>
              <Textarea id="task-desc" name="description" rows={2} defaultValue={taskDialog.editing?.description ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t.priority}</Label>
                <Select name="priority" defaultValue={taskDialog.editing?.priority ?? "medium"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t.prio_low}</SelectItem>
                    <SelectItem value="medium">{t.prio_medium}</SelectItem>
                    <SelectItem value="high">{t.prio_high}</SelectItem>
                    <SelectItem value="urgent">{t.prio_urgent}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="task-due">{t.dueDate} <span className="text-muted-foreground">({t.optional})</span></Label>
                <Input id="task-due" name="dueDate" type="date" defaultValue={taskDialog.editing?.dueDate ?? ""} className="num" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>{t.project}</Label>
              <Select name="projectId" defaultValue={taskDialog.editing?.projectId ?? "none"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.noProject}</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2"><Dot color={p.color} />{p.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="mt-1">
              <Button type="button" variant="outline" onClick={() => setTaskDialog({ open: false, editing: null })}>{t.cancel}</Button>
              <Button type="submit">{t.save}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* projects dialog */}
      <Dialog open={projDialog} onOpenChange={setProjDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.manageProjects}</DialogTitle>
          </DialogHeader>

          <form onSubmit={submitProject} className="grid gap-3">
            <div className="flex items-end gap-2">
              <div className="grid flex-1 gap-1.5">
                <Label htmlFor="proj-name">{t.projectName}</Label>
                <Input id="proj-name" value={editProj.name} onChange={(e) => setEditProj((s) => ({ ...s, name: e.target.value }))} placeholder={t.newProject} required />
              </div>
              <div className="flex gap-1 pb-1" role="radiogroup" aria-label={t.color}>
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c} type="button" role="radio" aria-checked={editProj.color === c}
                    onClick={() => setEditProj((s) => ({ ...s, color: c }))}
                    className={cn("size-6 rounded-full border-2 transition-transform", editProj.color === c ? "border-foreground scale-110" : "border-transparent")}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <Button type="submit" className="mb-0.5">{editProj.id ? t.save : t.add}</Button>
            </div>
          </form>

          <div className="max-h-64 overflow-y-auto">
            {projects.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">{t.noProjects}</p>
            ) : (
              <ul className="divide-y">
                {projects.map((p) => {
                  const count = tasks.filter((x) => x.projectId === p.id).length;
                  return (
                    <li key={p.id} className="flex items-center gap-2.5 py-2.5">
                      <Dot color={p.color} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
                      <Badge variant="secondary" className="num text-[10px]">{count} {t.tasksCount}</Badge>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditProj({ id: p.id, name: p.name, color: p.color })} aria-label={t.edit}>
                        <Pencil className="size-3.5" aria-hidden />
                      </Button>
                      <ConfirmButton
                        title={t.confirmDeleteTitle} body={t.projectDeleteWarn}
                        confirmLabel={t.yesDelete} cancelLabel={t.cancel}
                        onConfirm={() => { if (editProj.id === p.id) setEditProj({ name: "", color: PROJECT_COLORS[0] }); deleteProject(p.id); }}
                      >
                        <Button variant="ghost" size="icon" className="size-7 text-destructive" aria-label={t.delete}>
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      </ConfirmButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function fmtLocal(n: number, locale: string) {
  try { return new Intl.NumberFormat(locale === "fa" ? "fa-IR" : locale === "ar" ? "ar-SA-u-nu-latn" : "en-US").format(n); }
  catch { return String(n); }
}
