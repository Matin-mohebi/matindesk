// MatinDesk — formatting & date helpers
import type { Locale } from "./types";
import type { T } from "./i18n";

export function localeTag(locale: Locale): string {
  switch (locale) {
    case "fa": return "fa-IR";
    case "ar": return "ar-SA-u-ca-gregory-nu-latn";
    default: return "en-US";
  }
}

/** Localized number (Persian digits for fa). */
export function fmtNum(n: number, locale: Locale): string {
  try {
    return new Intl.NumberFormat(localeTag(locale)).format(n);
  } catch {
    return String(n);
  }
}

export const CURRENCIES: { code: string; labels: Record<Locale, string> }[] = [
  { code: "IRT", labels: { fa: "تومان", en: "Toman", ar: "تومان" } },
  { code: "IRR", labels: { fa: "ریال", en: "Rial", ar: "ريال" } },
  { code: "USD", labels: { fa: "دلار", en: "USD", ar: "دولار" } },
  { code: "EUR", labels: { fa: "یورو", en: "EUR", ar: "يورو" } },
];

export function currencyLabel(code: string, locale: Locale): string {
  const c = CURRENCIES.find((c) => c.code === code);
  return c ? c.labels[locale] : code;
}

export function fmtMoney(n: number, locale: Locale, currency: string): string {
  const sign = n < 0 ? "−" : "";
  return `${sign}${fmtNum(Math.abs(Math.round(n)), locale)} ${currencyLabel(currency, locale)}`;
}

/** Compact money for stat cards (e.g. ۱.۲ میلیون / 1.2M) */
export function fmtMoneyCompact(n: number, locale: Locale, currency: string): string {
  const abs = Math.abs(n);
  let value = n;
  let suffix = "";
  if (abs >= 1_000_000_000) { value = n / 1_000_000_000; suffix = locale === "fa" ? " میلیارد" : "B"; }
  else if (abs >= 1_000_000) { value = n / 1_000_000; suffix = locale === "fa" ? " میلیون" : "M"; }
  else if (abs >= 10_000) { value = n / 1_000; suffix = locale === "fa" ? " هزار" : "K"; }
  else return fmtMoney(n, locale, currency);
  const rounded = Math.round(value * 10) / 10;
  return `${fmtNum(rounded, locale)}${suffix} ${currencyLabel(currency, locale)}`;
}

/** ISO date (yyyy-mm-dd) for a Date, in local time. */
export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function diffDays(fromISO: string, toISODate: string): number {
  const a = new Date(fromISO + "T00:00:00").getTime();
  const b = new Date(toISODate + "T00:00:00").getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Human date, e.g. «۵ آبان ۱۴۰۴» / "Nov 5, 2026" (Jalali automatically for fa). */
export function fmtDate(iso: string, locale: Locale, opts?: Intl.DateTimeFormatOptions): string {
  try {
    const d = new Date(iso + (iso.length <= 10 ? "T00:00:00" : ""));
    return new Intl.DateTimeFormat(localeTag(locale), opts ?? { day: "numeric", month: "long", year: "numeric" }).format(d);
  } catch {
    return iso;
  }
}

/** Relative label: امروز / دیروز / ±N روز */
export function fmtRelative(iso: string, locale: Locale, t: T): string {
  const d = diffDays(todayISO(), iso);
  if (d === 0) return t.today;
  if (locale === "fa") {
    if (d === 1) return "فردا";
    if (d === -1) return "دیروز";
    return d > 0 ? `${fmtNum(d, locale)} روز دیگر` : `${fmtNum(-d, locale)} روز پیش`;
  }
  if (locale === "ar") {
    if (d === 1) return "غدًا";
    if (d === -1) return "أمس";
    return d > 0 ? `بعد ${fmtNum(d, locale)} يوم` : `قبل ${fmtNum(-d, locale)} يوم`;
  }
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  return d > 0 ? `in ${d} days` : `${-d} days ago`;
}

export function fmtTime(time: string, locale: Locale): string {
  try {
    const [h, m] = time.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return new Intl.DateTimeFormat(localeTag(locale), { hour: "numeric", minute: "2-digit" }).format(d);
  } catch {
    return time;
  }
}

/** Short weekday names starting from Saturday (fa/ar) or Sunday (en). */
export function weekdayHeaders(locale: Locale): string[] {
  const base = new Date(2023, 0, 1); // Sunday
  const fmt = new Intl.DateTimeFormat(localeTag(locale), { weekday: "short" });
  const sunToSat = Array.from({ length: 7 }, (_, i) => fmt.format(new Date(base.getTime() + i * 86_400_000)));
  return locale === "en" ? sunToSat : [sunToSat[6], ...sunToSat.slice(0, 6)];
}

export interface GridCell {
  iso: string;
  day: number;
  inMonth: boolean;
}

/** 6×7 month grid; weeks start on Saturday for fa/ar, Sunday for en. */
export function monthGrid(year: number, month: number, locale: Locale): GridCell[] {
  const first = new Date(year, month, 1);
  const weekStart = locale === "en" ? 0 : 6;
  const shift = (first.getDay() - weekStart + 7) % 7;
  const start = new Date(year, month, 1 - shift);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { iso: toISO(d), day: d.getDate(), inMonth: d.getMonth() === month };
  });
}

/** Jalali day number shown as a small label (fa only). */
export function jalaliDayLabel(iso: string, locale: Locale): string | null {
  if (locale !== "fa") return null;
  try {
    return new Intl.DateTimeFormat("fa-IR", { day: "numeric" }).format(new Date(iso + "T00:00:00"));
  } catch {
    return null;
  }
}

/** Month/year heading for the calendar (Jalali for fa). */
export function monthHeading(date: Date, locale: Locale): string {
  const mid = new Date(date.getFullYear(), date.getMonth(), 15);
  try {
    if (locale === "fa") {
      const jal = new Intl.DateTimeFormat("fa-IR", { month: "long", year: "numeric" }).format(mid);
      const greg = new Intl.DateTimeFormat("fa-IR-u-ca-gregory", { month: "long", year: "numeric" }).format(mid);
      return `${jal}  ·  ${greg}`;
    }
    return new Intl.DateTimeFormat(localeTag(locale), { month: "long", year: "numeric" }).format(mid);
  } catch {
    return `${date.getFullYear()}-${date.getMonth() + 1}`;
  }
}

export const PROJECT_COLORS = ["#10b981", "#14b8a6", "#f59e0b", "#f43f5e", "#8b5cf6", "#64748b"];

export const NOTE_COLORS = ["#10b981", "#14b8a6", "#f59e0b", "#f43f5e", "#8b5cf6", "#64748b"];

export function hashColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PROJECT_COLORS[h % PROJECT_COLORS.length];
}

export function hostOf(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 30);
  }
}

export function normalizeUrl(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}

export function download(filename: string, content: string, mime = "application/json") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
