import { TIME_ZONE } from "@/i18n/config";

/** Chave do dia (AAAA-MM-DD) no fuso do produto, para separar as mensagens por dia. */
export function dayKey(iso: string, timeZone = TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/** Horário curto em mono, como o DS pede ("10:26"). */
export function shortTime(iso: string, locale: string, timeZone = TIME_ZONE): string {
  return new Intl.DateTimeFormat(locale, { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

/** Rótulo do separador: Hoje, Ontem ou "qui, 15/10". */
export function dayLabel(
  iso: string,
  now: Date,
  locale: string,
  labels: { today: string; yesterday: string },
  timeZone = TIME_ZONE,
): string {
  const key = dayKey(iso, timeZone);
  if (key === dayKey(now.toISOString(), timeZone)) return labels.today;
  const y = new Date(now.getTime() - 86_400_000);
  if (key === dayKey(y.toISOString(), timeZone)) return labels.yesterday;
  return new Intl.DateTimeFormat(locale, { timeZone, weekday: "short", day: "2-digit", month: "2-digit" })
    .format(new Date(iso))
    .replace(".", "");
}

/** Quando, no seletor de conversas (V4.6): a hora se for hoje ("08:40"), senão o dia ("23/09"). */
export function threadAt(iso: string, now: Date, locale: string, timeZone = TIME_ZONE): string {
  if (dayKey(iso, timeZone) === dayKey(now.toISOString(), timeZone)) return shortTime(iso, locale, timeZone);
  return new Intl.DateTimeFormat(locale, { timeZone, day: "2-digit", month: "2-digit" }).format(new Date(iso));
}

/** Título de uma conversa nova: a primeira mensagem da pessoa, cortada como no protótipo (34 → 32 + "…"). */
export function threadTitleFrom(body: string): string {
  const text = body.trim().replace(/\s+/g, " ");
  return text.length > 34 ? text.slice(0, 32) + "…" : text;
}
