// MatinDesk — seed a fresh account with a friendly starter workspace.
import { db } from "@/lib/db";

function iso(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
function dayOfMonth(day: number): string {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), Math.min(day, 28)).toISOString().slice(0, 10);
}
const now = () => new Date();

export async function seedWorkspace(userId: string, name: string) {
  const p1 = await db.project.create({ data: { userId, name: "طراحی وب‌سایت", color: "#10b981", createdAt: now() } });
  const p2 = await db.project.create({ data: { userId, name: "یادگیری زبان انگلیسی", color: "#f59e0b", createdAt: now() } });
  const p3 = await db.project.create({ data: { userId, name: "امور خانه", color: "#8b5cf6", createdAt: now() } });

  const tasks = [
    { title: "اصلاح باگ فرم تماس سایت", description: "اعتبارسنجی ایمیل کار نمی‌کند.", projectId: p1.id, priority: "urgent", status: "todo", dueDate: iso(-2) },
    { title: `به ماتین‌دسک خوش آمدید، ${name}!`, description: "این یک وظیفه نمونه است — می‌توانید انجامش‌دهید یا حذفش کنید.", projectId: null, priority: "medium", status: "todo", dueDate: iso(0) },
    { title: "خرید هفتگی از بازار", description: null, projectId: p3.id, priority: "medium", status: "todo", dueDate: iso(0) },
    { title: "تمرین ۳۰ لغت جدید", description: "درس ۵ کتاب لغت.", projectId: p2.id, priority: "high", status: "todo", dueDate: iso(1) },
    { title: "نوشتن مقاله وبلاگ درباره طراحی RTL", description: null, projectId: p1.id, priority: "high", status: "in_progress", dueDate: iso(2) },
    { title: "پرداخت قبض برق", description: null, projectId: p3.id, priority: "high", status: "todo", dueDate: iso(3) },
    { title: "مرتب‌سازی اتاق کار", description: null, projectId: p3.id, priority: "low", status: "todo", dueDate: iso(5) },
    { title: "جلسه آنلاین مکالمه زبان", description: null, projectId: p2.id, priority: "medium", status: "done", dueDate: iso(0) },
    { title: "طراحی لوگوی نسخه جدید", description: null, projectId: p1.id, priority: "medium", status: "done", dueDate: iso(-1) },
    { title: "بازبینی آمار داشبورد", description: null, projectId: null, priority: "low", status: "done", dueDate: iso(-2) },
  ];
  for (const t of tasks) {
    await db.task.create({
      data: {
        userId, ...t,
        createdAt: t.status === "done" ? new Date(Date.now() - 3 * 86_400_000) : now(),
        completedAt: t.status === "done" ? now() : null,
      },
    });
  }

  const notes = [
    { title: "ایده‌های نسخه بعدی ماتین‌دسک", content: "• تقویم جلالی کامل\n• همگام‌سازی با گیت‌هاب\n• حالت تمرکز با تایمر پومودورو", color: "#10b981", pinned: true },
    { title: "لغات مهم هفته", content: "deadline = مهلت\nestimate = برآورد کردن\nship = عرضه کردن", color: "#f59e0b", pinned: false },
    { title: "چک‌لیست سفر شمال", content: "شارژر، کوله، کرم ضدآفتاب، کتاب", color: "#14b8a6", pinned: false },
  ];
  for (const n of notes) await db.note.create({ data: { userId, ...n, createdAt: now() } });

  const bookmarks = [
    { title: "GitHub", url: "https://github.com", category: "work" },
    { title: "MDN Web Docs", url: "https://developer.mozilla.org", category: "learning" },
    { title: "Vazirmatn Font", url: "https://github.com/rastikerdar/vazirmatn", category: "tools" },
  ];
  for (const b of bookmarks) await db.bookmark.create({ data: { userId, ...b, createdAt: now() } });

  const txs = [
    { type: "income", amount: 45_000_000, category: "inc_salary", note: "حقوق ماهانه", date: dayOfMonth(1) },
    { type: "income", amount: 12_500_000, category: "inc_freelance", note: "پروژه طراحی لوگو", date: dayOfMonth(10) },
    { type: "expense", amount: 3_200_000, category: "exp_shopping", note: "کفش", date: dayOfMonth(4) },
    { type: "expense", amount: 2_400_000, category: "exp_food", note: "خرید هفتگی", date: dayOfMonth(8) },
    { type: "expense", amount: 1_900_000, category: "exp_bills", note: "قبض برق و گاز", date: dayOfMonth(12) },
    { type: "expense", amount: 850_000, category: "exp_transport", note: "بنزین و تاکسی", date: dayOfMonth(14) },
    { type: "expense", amount: 620_000, category: "exp_fun", note: "سینما", date: dayOfMonth(16) },
  ];
  for (const x of txs) await db.transaction.create({ data: { userId, ...x, createdAt: now() } });

  const events = [
    { title: "جلسه هفتگی تیم", date: iso(0), time: "10:00", reminderMinutes: 15, note: "" },
    { title: "کلاس آنلاین زبان", date: iso(3), time: "18:00", reminderMinutes: 60, note: null },
    { title: "تمدید بیمه خودرو", date: iso(7), time: null, reminderMinutes: 1440, note: null },
    { title: "تولد دوستم", date: iso(12), time: null, reminderMinutes: 0, note: null },
  ];
  for (const e of events) await db.calEvent.create({ data: { userId, ...e, createdAt: now() } });
}
