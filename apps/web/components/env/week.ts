import { TIME_ZONE } from "@/i18n/config";

/** Segunda a domingo da semana de `now`, no fuso do produto (o calendário editorial abre na semana atual). */
export function currentWeek(now: Date, locale: string, timeZone = TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const y = Number(get("year"));
  const m = Number(get("month"));
  const d = Number(get("day"));
  const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
  const start = new Date(Date.UTC(y, m - 1, d - wd));
  const end = new Date(Date.UTC(y, m - 1, d - wd + 6));
  // Abreviação do próprio idioma ("out", "oct", "Oct"): pt-BR e es já vêm em minúscula; en, com maiúscula.
  const month = (date: Date) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "short" }).format(date).replace(".", "");
  return {
    from: start.getUTCDate(),
    to: end.getUTCDate(),
    monthFrom: month(start),
    month: month(end),
    sameMonth: start.getUTCMonth() === end.getUTCMonth(),
  };
}
