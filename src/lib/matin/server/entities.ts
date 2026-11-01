// MatinDesk — entity registry shared by the generic CRUD route.
export const ENTITIES = {
  projects: {
    model: "project",
    fields: ["name", "color"],
    required: ["name"],
  },
  tasks: {
    model: "task",
    fields: ["title", "description", "projectId", "priority", "status", "dueDate", "completedAt"],
    required: ["title"],
  },
  notes: {
    model: "note",
    fields: ["title", "content", "color", "pinned"],
    required: ["title"],
  },
  bookmarks: {
    model: "bookmark",
    fields: ["title", "url", "category"],
    required: ["title", "url"],
  },
  transactions: {
    model: "transaction",
    fields: ["type", "amount", "category", "note", "date"],
    required: ["type", "amount", "category", "date"],
  },
  events: {
    model: "calEvent",
    fields: ["title", "date", "time", "reminderMinutes", "note"],
    required: ["title", "date"],
  },
} as const;

export type EntityName = keyof typeof ENTITIES;

export function isEntity(name: string): name is EntityName {
  return Object.prototype.hasOwnProperty.call(ENTITIES, name);
}

const NULLABLE = new Set(["description", "note", "time", "dueDate", "projectId"]);

/** Whitelist + coerce incoming fields for the given entity. */
export function sanitize(name: EntityName, body: Record<string, unknown>): Record<string, unknown> {
  const spec = ENTITIES[name];
  const out: Record<string, unknown> = {};
  for (const f of spec.fields) {
    if (!(f in body)) continue;
    let v = body[f];
    if (NULLABLE.has(f) && (v === "" || v === undefined)) v = null;
    if (f === "amount") v = Math.max(0, Number(v) || 0);
    if (f === "reminderMinutes") v = Math.max(0, Math.min(60 * 24 * 30, Number(v) || 0));
    if (f === "pinned") v = Boolean(v);
    if (typeof v === "string") {
      const cap = f === "content" ? 50_000 : f === "description" || f === "note" ? 5_000 : 500;
      v = v.slice(0, cap);
    }
    out[f] = v;
  }
  return out;
}
