"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { MetricSeries } from "./metrics";

/** Chave do catálogo montada com o id que vem da API (canal, métrica, origem, estado): conferida com `has` antes. */
export const k = (key: string) => key as never;

/** Rótulos e formatos dos números da Íris (Resultados e o "Desempenho orgânico" do Conteúdo leem do mesmo jeito). */
export function useLabels() {
  const t = useTranslations("results");
  const format = useFormatter();
  const day = (n: number) => format.dateTime(new Date(n * 86_400_000), { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  const range = (a: number, b: number) => t("range", { from: day(a), to: day(b) });
  const label = (s: Pick<MetricSeries, "channel" | "metric">) =>
    t.has(k(`series.${s.channel}.${s.metric}`)) ? t(k(`series.${s.channel}.${s.metric}`)) : `${s.channel} · ${s.metric}`;
  const unit = (s: Pick<MetricSeries, "metric" | "unit">) => (t.has(k(`units.${s.metric}`)) ? t(k(`units.${s.metric}`)) : s.unit);
  const num = (v: number) => format.number(v, { maximumFractionDigits: v < 100 && !Number.isInteger(v) ? 1 : 0 });
  const pct = (v: number) => format.number(Math.abs(v) / 100, { style: "percent", maximumFractionDigits: 1 });
  const signed = (v: number) => format.number(v / 100, { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" });
  const sources = (list: string[]) =>
    list.map((s) => (t.has(k(`sourceNames.${s}`)) ? t(k(`sourceNames.${s}`)) : s)).join(", ");
  return { t, format, day, range, label, unit, num, pct, signed, sources };
}
