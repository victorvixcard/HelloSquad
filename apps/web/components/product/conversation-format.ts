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
