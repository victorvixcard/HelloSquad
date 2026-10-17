import type { QualityRates, QualityRow } from "@/lib/admin";

/*
 * Qualidade das entregas (SA0 `qualidade.js` → `GET /admin/quality` e `/admin/quality/compare`). Contagens viram taxa
 * na comparação (os períodos têm volumes diferentes): as taxas e a diferença (b − a) vêm prontas da API; aqui só a
 * leitura (melhorou, piorou, sem mudança) sai da diferença arredondada como é mostrada, como no protótipo.
 */

export type QualityMetric = keyof QualityRates;

/** As seis métricas do SA0, na ordem dele: 1 = maior é melhor; −1 = menor é melhor. `scale` e `digits` = como mostrar a diferença. */
export const QUALITY_METRICS: { key: QualityMetric; better: 1 | -1; scale: number; digits: number; unit: "pp" | "num" | "usd" | "per100" }[] = [
  { key: "approved_first_rate", better: 1, scale: 100, digits: 0, unit: "pp" },
  { key: "adjustments_per_delivery", better: -1, scale: 1, digits: 2, unit: "num" },
  { key: "not_approved_rate", better: -1, scale: 100, digits: 1, unit: "pp" },
  { key: "ai_cost_per_approved_usd", better: -1, scale: 1, digits: 2, unit: "usd" },
  { key: "agent_errors_per_100", better: -1, scale: 1, digits: 1, unit: "per100" },
  { key: "failed_calls_per_100", better: -1, scale: 1, digits: 1, unit: "per100" },
];

export type Reading = "better" | "worse" | "same" | "none";

/** Leitura da diferença já arredondada como aparece: se ela aparece como zero, é "sem mudança". */
export function readDelta(delta: string | null, better: 1 | -1, scale: number, digits: number): { reading: Reading; shown: number | null } {
  if (delta === null) return { reading: "none", shown: null };
  const d = Number(delta) * scale;
  const shown = Number(d.toFixed(digits));
  if (shown === 0) return { reading: "same", shown: 0 };
  return { reading: shown * better > 0 ? "better" : "worse", shown };
}

/** Linha de total da tabela por tipo, das próprias linhas (contagens somadas; taxas recalculadas das somas). */
export function qualityTotal(rows: QualityRow[]) {
  const sum = (k: "deliveries" | "approved_first_time" | "approved" | "adjustments" | "not_approved" | "failed_steps" | "agent_errors") =>
    rows.reduce((a, r) => a + r[k], 0);
  const deliveries = sum("deliveries");
  const approved = sum("approved");
  const cost = rows.reduce((a, r) => a + Number(r.ai_cost_usd), 0);
  return {
    deliveries,
    firstRate: deliveries ? sum("approved_first_time") / deliveries : null,
    adjustments: deliveries ? sum("adjustments") / deliveries : null,
    notApproved: sum("not_approved"),
    costPerApproved: approved ? cost / approved : null,
    agentErrors: sum("agent_errors"),
    failedSteps: sum("failed_steps"),
  };
}

/** Mês `AAAA-MM`: primeiro dia e último (o mês corrente termina hoje). */
export function monthRange(month: string, today: string): { since: string; until: string } {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { since: `${month}-01`, until: last > today ? today : last };
}

/** Os últimos `n` meses até o de hoje, do mais recente para o mais antigo (`AAAA-MM`). */
export function recentMonths(today: string, n = 12): string[] {
  const [y, m] = today.split("-").map(Number) as [number, number];
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    return d.toISOString().slice(0, 7);
  });
}
