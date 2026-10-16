import type { components } from "@hellosquad/contracts";
import { TIME_ZONE } from "@/i18n/config";

export type CalendarPost = components["schemas"]["CalendarPost"];

/** O que a página do servidor entrega ao calendário: a janela lida, os posts e o que liga cada post à decisão. */
export type CalendarData = {
  /** false quando a API não respondeu: a tela mostra o vazio honesto, nunca post inventado. */
  ok: boolean;
  /** Hoje no fuso do produto (AAAA-MM-DD), calculado no servidor para a semana não mudar na hidratação. */
  today: string;
  from: string;
  to: string;
  items: CalendarPost[];
  /** Versão em revisão (id da versão → número e aprovação pendente): "v1 aguarda a sua aprovação" e "Aprovar v1". */
  versions: Record<string, { no: number; approvalId: string }>;
  /** Título do trabalho de origem (id do trabalho → título), para "Origem". */
  works: Record<string, string>;
};

/** Sinal da V4.6 (`_calItems`): aguarda você, agendado, publicado e o aprovado sem autorização de publicação. */
export type Sk = "you" | "prog" | "done" | "pause";

const DAY = 864e5;

/** Dia como número inteiro (dias desde 1970-01-01, UTC): a aritmética do calendário sem fuso. */
export function dayNum(iso: string): number {
  return Math.round(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / DAY);
}

export function isoOf(n: number): string {
  return new Date(n * DAY).toISOString().slice(0, 10);
}

export function dateOf(n: number): Date {
  return new Date(n * DAY);
}

/** 0 = domingo … 6 = sábado. */
export function weekdayOf(n: number): number {
  return dateOf(n).getUTCDay();
}

export function mondayOf(n: number): number {
  return n - ((weekdayOf(n) + 6) % 7);
}

/** Hoje no fuso do produto. */
export function todayIso(now: Date, timeZone = TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Semana ISO (a "Semana 43" da V4.6, `wkWeek`). */
export function isoWeek(n: number): number {
  const d = dateOf(n);
  const k = d.getUTCDay() || 7;
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 4 - k));
  return Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / DAY + 1) / 7);
}

/** Limites da navegação da V4.6 (L10769–10773): duas semanas para trás e quatro para a frente; um mês de cada lado. */
export const WEEK_MIN = -2;
export const WEEK_MAX = 4;
export const MONTH_MIN = -1;
export const MONTH_MAX = 1;

/** Janela que o servidor lê de uma vez: as semanas que a navegação alcança (49 dias, dentro dos 92 da API). */
export function initialWindow(today: string): { from: string; to: string } {
  const w0 = mondayOf(dayNum(today));
  return { from: isoOf(w0 + WEEK_MIN * 7), to: isoOf(w0 + WEEK_MAX * 7 + 6) };
}

/** Grade do mês (segunda a domingo, como `ct-mo-g`) do mês de hoje deslocado em `moff`. */
export function monthGrid(today: string, moff: number): { first: number; last: number; g0: number; g1: number; year: number; month: number } {
  const t = dateOf(dayNum(today));
  const mo = t.getUTCMonth() + moff;
  const year = t.getUTCFullYear() + Math.floor(mo / 12);
  const month = ((mo % 12) + 12) % 12;
  const first = Math.round(Date.UTC(year, month, 1) / DAY);
  const last = Math.round(Date.UTC(year, month + 1, 1) / DAY) - 1;
  const g0 = mondayOf(first);
  const g1 = mondayOf(last) + 6;
  return { first, last, g0, g1, year, month };
}

export function statusSk(status: string): Sk {
  if (status === "draft") return "you";
  if (status === "planned") return "pause";
  if (status === "published") return "done";
  return "prog";
}

/** "09:00" ou "09:00:00" → horas e minutos para o catálogo ("9h", "18h30"); null sem horário. */
export function timeParts(time: string | null | undefined): { h: string; m: string } | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!m) return null;
  return { h: String(Number(m[1])), m: m[2] };
}

/** Partes do intervalo de uma semana para `content.rangeSame` / `content.rangeCross` (mesma forma da A1f). */
export function weekRangeParts(ws: number, locale: string) {
  const a = dateOf(ws);
  const b = dateOf(ws + 6);
  const month = (d: Date) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "short" }).format(d).replace(".", "");
  return { from: a.getUTCDate(), to: b.getUTCDate(), monthFrom: month(a), month: month(b), sameMonth: a.getUTCMonth() === b.getUTCMonth() };
}

/** "seg, 19/10" (V4.6 `wkF`), no idioma da tela. */
export function shortDate(n: number, locale: string): string {
  const d = dateOf(n);
  const wd = new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "short" }).format(d).replace(".", "");
  const dm = new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "2-digit", month: "2-digit" }).format(d);
  return `${wd}, ${dm}`;
}

/** "SEG" … "DOM" (V4.6 `WD_L`), no idioma da tela. */
export function weekdayHead(n: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "short" }).format(dateOf(n)).replace(".", "").toLocaleUpperCase(locale);
}

/** "Outubro de 2026" (V4.6 `MO_L[mm] + ' de ' + y`), no idioma da tela. */
export function monthTitle(year: number, month: number, locale: string): string {
  const s = new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month, 1)));
  return s.charAt(0).toLocaleUpperCase(locale) + s.slice(1);
}

/** Junta os posts por id (a leitura mais nova vale) e ordena por dia e horário. */
export function mergePosts(...lists: CalendarPost[][]): CalendarPost[] {
  const byId = new Map<string, CalendarPost>();
  for (const list of lists) for (const p of list) byId.set(p.id, p);
  return [...byId.values()].sort(
    (a, b) => a.scheduled_on.localeCompare(b.scheduled_on) || (a.scheduled_time ?? "99").localeCompare(b.scheduled_time ?? "99") || a.theme.localeCompare(b.theme),
  );
}
