import { TIME_ZONE } from "@/i18n/config";
import type { AlertRule, EconomicReadings } from "@/lib/admin";

/*
 * Leituras econômicas do Consumo por cliente (SA0 `consumo.js` → `GET /admin/consumption`). Quem decide se a leitura
 * está fora da faixa é a API (`economics.alerts`); aqui só formata e diz o estado do cartão. As faixas são proposta.
 */

export type EconomicMetric = AlertRule["metric"];

/** A ordem dos três cartões do SA0: IA por crédito, margem bruta estimada, tendência do custo por turno. */
export const ECONOMIC_METRICS: EconomicMetric[] = ["ai_cost_per_credit_brl", "gross_margin", "cost_per_turn_trend"];

/** Estado do cartão: fora da faixa (a API mandou o alerta), dentro, ou sem dado para ler. */
export type ReadingState = "attention" | "ok" | "none";

export function readingState(readings: EconomicReadings, metric: EconomicMetric): ReadingState {
  if (readings.alerts.some((a) => a.metric === metric)) return "attention";
  return readings[metric] === null ? "none" : "ok";
}

/** Valor da leitura no formato do SA0: R$ com três casas, margem em %, tendência com sinal ("+10%", "−5%"). */
export function metricFormat(locale: string) {
  const brl3 = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL", minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  return (metric: EconomicMetric, value: string | number | null): string | null => {
    if (value === null) return null;
    const n = Number(value);
    if (metric === "ai_cost_per_credit_brl") return brl3.format(n);
    if (metric === "gross_margin") return n < 0 ? `−${pct.format(-n)}` : pct.format(n);
    const rounded = Math.round(Math.abs(n) * 100);
    return `${rounded === 0 ? "" : n > 0 ? "+" : "−"}${pct.format(rounded / 100)}`;
  };
}

/** Dia de hoje em Brasília (a API lê `since`/`until` em dias de Brasília), menos `back` dias. */
export function brDay(back = 0, now = new Date()): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}
