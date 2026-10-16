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

/**
 * Conversa de objeto com sugestões próprias na V4.6 (`_cx`): indicador (L9806), publicação (L9792) e oportunidade
 * (L9823, com as do Otto quando ele responde). Devolve a chave do catálogo `conversation.objectAsk`, ou null.
 */
export function objectAskKey(kind: string, agent: string | null): "metric" | "calendar_post" | "opportunity" | "opportunityOtto" | null {
  if (kind === "metric" || kind === "calendar_post") return kind;
  if (kind === "opportunity") return agent === "otto" ? "opportunityOtto" : "opportunity";
  return null;
}

/**
 * Número do indicador na conversa (V4.6 `big`, `bigD`, `bigUp` e a curva, L9806 e L10946), já formatado por quem
 * abre a conversa a partir da série real. Sem ele, o painel não desenha número nem curva (nada é inventado).
 */
export type MetricFigure = {
  value: string;
  /** Variação contra o período anterior ("+18%"); null sem período anterior com dado. */
  delta: string | null;
  up: boolean | null;
  /** Valores da série no período, na ordem, para a curva. */
  points: number[];
  /** Período atual e o anterior, como a página mostra ("17/09 a 16/10", "18/08 a 16/09"). */
  period: string;
  previous: string | null;
};

/** Curva do indicador (V4.6 `_spark`, L8473): a linha e a área sob ela, na caixa W×H. */
export function sparkPaths(points: number[], w: number, h: number): { line: string; area: string } | null {
  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const x = (i: number) => (i / (points.length - 1)) * w;
  const y = (v: number) => 4 + (h - 8) * (1 - (v - min) / Math.max(1e-6, max - min));
  const line = "M" + points.map((v, i) => `${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" L");
  return { line, area: `${line} L${w} ${h} L0 ${h} Z` };
}

/** Título de uma conversa nova: a primeira mensagem da pessoa, cortada como no protótipo (34 → 32 + "…"). */
export function threadTitleFrom(body: string): string {
  const text = body.trim().replace(/\s+/g, " ");
  return text.length > 34 ? text.slice(0, 32) + "…" : text;
}
