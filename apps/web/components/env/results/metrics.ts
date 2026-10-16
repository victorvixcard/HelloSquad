import type { components } from "@hellosquad/contracts";

export type MetricSeries = components["schemas"]["MetricSeries"];
export type PeriodId = "week" | "month" | "quarter";

/** "Semana", "Mês" e "Trimestre": 7, 30 e 90 dias até o último dia com dado (os mesmos períodos do worker da Íris). */
export const PERIOD_DAYS: Record<PeriodId, number> = { week: 7, month: 30, quarter: 90 };
export const PERIODS: PeriodId[] = ["week", "month", "quarter"];

/** Estoque: vale o último valor do período, não a soma (como `STOCK_METRICS` em `squad/data.py`). */
export const STOCK_METRICS = new Set(["followers"]);

/**
 * Os três indicadores da V4.6 (`RS_KPIS`) que existem na base, na ordem do protótipo: encomendas (em destaque),
 * visitas e alcance. Na API: `store.orders`, `site.sessions` e `instagram.reach`.
 */
export const KPI_KEYS = ["store.orders", "site.sessions", "instagram.reach"] as const;

const MS_DAY = 86_400_000;

/** Dia ISO (AAAA-MM-DD) como número de dias desde 1970, sem fuso: as séries são diárias. */
export function dayNumber(iso: string): number {
  return Math.round(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / MS_DAY);
}

export function isoDay(n: number): string {
  return new Date(n * MS_DAY).toISOString().slice(0, 10);
}

export const seriesKey = (s: Pick<MetricSeries, "channel" | "metric">) => `${s.channel}.${s.metric}`;

function valuesByDay(s: MetricSeries): Map<number, number> {
  const out = new Map<number, number>();
  for (const p of s.points) {
    const v = Number(p.value);
    if (Number.isFinite(v)) out.set(dayNumber(p.day), v);
  }
  return out;
}

/** Último dia com dado entre todas as séries (o fim do período, como `atualizado_ate` do worker). */
export function lastDataDay(series: MetricSeries[]): number | null {
  let last: number | null = null;
  for (const s of series) for (const p of s.points) last = Math.max(last ?? -Infinity, dayNumber(p.day));
  return last;
}

export type Range = { start: number; end: number };

export function periodRanges(last: number, days: number): { current: Range; previous: Range } {
  const start = last - days + 1;
  return { current: { start, end: last }, previous: { start: start - days, end: start - 1 } };
}

export type Summary = {
  key: string;
  channel: string;
  metric: string;
  stock: boolean;
  /** Soma do período (fluxo) ou último valor (estoque); null sem nenhum dia com dado. */
  now: number | null;
  before: number | null;
  /** Variação em %, pela média diária dos dias com dado (fluxo) ou pelo último valor (estoque); null sem base. */
  variation: number | null;
  daysNow: number;
  daysBefore: number;
  days: number;
  sources: string[];
};

function variation(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return Math.round(((current - previous) * 100 * 10) / previous) / 10;
}

/** O mesmo cálculo de `metrics_evidence` (worker): dia sem dado não vira zero. */
export function summarize(s: MetricSeries, last: number, days: number): Summary {
  const { current, previous } = periodRanges(last, days);
  const byDay = valuesByDay(s);
  const pick = (r: Range) =>
    [...byDay.entries()].filter(([d]) => d >= r.start && d <= r.end).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  const cur = pick(current);
  const prev = pick(previous);
  const stock = STOCK_METRICS.has(s.metric);
  const sum = (a: number[]) => a.reduce((t, v) => t + v, 0);
  let now: number | null;
  let before: number | null;
  let change: number | null;
  if (stock) {
    now = cur.length ? (cur[cur.length - 1] ?? null) : null;
    before = prev.length ? (prev[prev.length - 1] ?? null) : null;
    change = variation(now, before);
  } else {
    now = cur.length ? sum(cur) : null;
    before = prev.length ? sum(prev) : null;
    change = variation(now === null ? null : now / cur.length, before === null ? null : before / prev.length);
  }
  return {
    key: seriesKey(s),
    channel: s.channel,
    metric: s.metric,
    stock,
    now,
    before,
    variation: change,
    daysNow: cur.length,
    daysBefore: prev.length,
    days,
    sources: s.sources,
  };
}

export type Week = {
  start: number;
  end: number;
  /** Total da semana (fluxo) ou último valor (estoque). null = lacuna: semana com dia sem dado não vira número. */
  value: number | null;
  daysWithData: number;
  /** Soma só dos dias com dado de uma semana incompleta (mostrada na tabela, nunca no gráfico). */
  partial: number | null;
};

/** As 12 semanas que terminam no último dia com dado (gráfico da V4.6: "por semana"). */
export function weekly(s: MetricSeries, last: number, weeks = 12): Week[] {
  const byDay = valuesByDay(s);
  const stock = STOCK_METRICS.has(s.metric);
  const out: Week[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const end = last - i * 7;
    const start = end - 6;
    const vals: number[] = [];
    for (let d = start; d <= end; d += 1) {
      const v = byDay.get(d);
      if (v !== undefined) vals.push(v);
    }
    const total = vals.reduce((t, v) => t + v, 0);
    if (stock) out.push({ start, end, value: vals.length ? (vals[vals.length - 1] ?? null) : null, daysWithData: vals.length, partial: null });
    else
      out.push({
        start,
        end,
        value: vals.length === 7 ? total : null,
        daysWithData: vals.length,
        partial: vals.length > 0 && vals.length < 7 ? total : null,
      });
  }
  return out;
}

/**
 * Conteúdo · "Desempenho orgânico" (V4.6 `ct.b`, L10783, com `RES['Semana']`): "Visitas ao site" (`site.sessions`) e
 * "Alcance" (`instagram.reach`) na última semana com dado, a mesma conta do período "Semana" de Resultados. Sem nenhum
 * número na semana, null: o card fica no vazio da V4.6 ("A Íris ainda não tem números do Instagram para ler.").
 */
export const ORGANIC_KEYS = ["site.sessions", "instagram.reach"] as const;
export type OrganicPerf = Range & { items: Summary[]; sources: string[] };

export function organicPerf(series: MetricSeries[]): OrganicPerf | null {
  const last = lastDataDay(series);
  if (last === null) return null;
  const days = PERIOD_DAYS.week;
  const items = ORGANIC_KEYS.flatMap((key) => {
    const s = series.find((x) => seriesKey(x) === key);
    return s ? [summarize(s, last, days)] : [];
  });
  if (!items.some((x) => x.now !== null)) return null;
  return { ...periodRanges(last, days).current, items, sources: [...new Set(items.flatMap((x) => x.sources))] };
}

/** Teto "redondo" do eixo e o passo das linhas de grade (4 ou 5 linhas). */
export function niceScale(max: number): { top: number; step: number } {
  if (!(max > 0)) return { top: 1, step: 1 };
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((m) => m >= raw) ?? 10 * pow;
  return { top: Math.ceil(max / step) * step, step };
}
