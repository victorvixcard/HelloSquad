import type { Family } from "@/components/env/projects/board";
import type { WorkItem, WorkItemDetail } from "@/lib/core";

/** Entregas da Bia que viram documento revisável (A2b). */
export const STRATEGY_TYPES = ["02.01", "02.02", "02.03", "02.04", "02.07"] as const;
export type StrategyType = (typeof STRATEGY_TYPES)[number];

export function isStrategyType(type: string | null | undefined): type is StrategyType {
  return !!type && (STRATEGY_TYPES as readonly string[]).includes(type);
}

/** Um documento da prateleira "Planos e diagnósticos": o trabalho com a versão mais recente entregue. */
export type StrategyDocItem = {
  workItemId: string;
  title: string;
  type: StrategyType;
  version: number;
  /** Quando a versão mais recente foi entregue (ISO). */
  at: string;
  /** you = aguarda você; done = aprovado; and = em andamento (ajuste ou nova proposta). */
  family: Extract<Family, "you" | "done" | "and">;
  /** Conceito da campanha (02.04), para a capa: dado da versão, nunca completado. */
  quote: string | null;
};

export type StrategyOpportunity = { titulo: string; descricao: string; prioridade: "alta" | "media" | "baixa" | null };

export type StrategyAnalysis = {
  workItemId: string;
  title: string;
  type: StrategyType | null;
  /** Frase viva da API ("Bia criando a primeira versão"), quando há. */
  statusLabel: string | null;
  dueAt: string | null;
  family: Extract<Family, "and" | "pause">;
};

export type StrategyDirection = {
  workItemId: string;
  title: string;
  posicionamento: string;
  /** Quando foi aprovado (decisão da aprovação; sem ela, a data da versão aprovada). */
  approvedAt: string | null;
  objetivo: { objetivo: string; indicador: string; prazo: string } | null;
  publico: string | null;
  /** Primeira ação do plano de marketing aprovado (02.03), quando há. */
  prioridade: { acao: string; horizonte: string } | null;
};

export type StrategyData = {
  /** Há algum trabalho da Bia (com ou sem versão): sem nenhum, a tela é o primeiro acesso da V4.6. */
  hasWork: boolean;
  direction: StrategyDirection | null;
  opportunities: StrategyOpportunity[];
  /** De onde as oportunidades vieram: o diagnóstico mais recente. */
  opportunitySource: { workItemId: string; title: string; version: number; at: string } | null;
  analyses: StrategyAnalysis[];
  docs: StrategyDocItem[];
};

export const EMPTY_STRATEGY: StrategyData = {
  hasWork: false,
  direction: null,
  opportunities: [],
  opportunitySource: null,
  analyses: [],
  docs: [],
};

type Version = WorkItemDetail["deliveries"][number]["versions"][number];

const s = (v: unknown) => (typeof v === "string" ? v : "");
const o = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const l = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function latestVersion(detail: WorkItemDetail): Version | null {
  const all = detail.deliveries.flatMap((d) => d.versions);
  return all.reduce<Version | null>((best, v) => (!best || v.version_no > best.version_no ? v : best), null);
}

function approvedVersion(detail: WorkItemDetail): Version | null {
  const all = detail.deliveries.flatMap((d) => d.versions).filter((v) => v.status === "approved");
  return all.reduce<Version | null>((best, v) => (!best || v.version_no > best.version_no ? v : best), null);
}

const RANK = { alta: 0, media: 1, baixa: 2 } as const;

function priorityOf(v: unknown): StrategyOpportunity["prioridade"] {
  return v === "alta" || v === "media" || v === "baixa" ? v : null;
}

/** Mais recente primeiro (pela data da versão ou, sem versão, pela criação do trabalho). */
const newest = (a: string, b: string) => (a < b ? 1 : a > b ? -1 : 0);

/**
 * Monta a tela de Estratégia só com o que a API devolveu: trabalhos da Bia (lista) e o detalhe de cada um (versões e
 * aprovações). Nada é completado: sem 02.02 aprovado não há direção; sem 02.01 não há oportunidades.
 */
export function buildStrategyData(works: WorkItem[], details: WorkItemDetail[]): StrategyData {
  const bia = works.filter((w) => w.primary_agent_id === "bia" && w.status !== "cancelled");
  if (!bia.length) return EMPTY_STRATEGY;
  const byId = new Map(details.map((d) => [d.id, d]));
  const docs: StrategyDocItem[] = [];
  const analyses: StrategyAnalysis[] = [];
  for (const w of bia) {
    const detail = byId.get(w.id);
    const latest = detail ? latestVersion(detail) : null;
    const type = isStrategyType(w.delivery_type) ? w.delivery_type : null;
    if (latest && type) {
      const pending = w.status === "needs_you" || !!w.pending_approval || w.awaiting_you;
      const approved = !pending && (latest.status === "approved" || w.status === "approved" || w.status === "done");
      const content = o(latest.content);
      docs.push({
        workItemId: w.id,
        title: s(content.titulo) || w.title,
        type,
        version: latest.version_no,
        at: latest.created_at,
        family: pending ? "you" : approved ? "done" : "and",
        quote: type === "02.04" ? s(o(content.conceito).nome) || null : null,
      });
    } else if (!latest && w.status !== "failed" && w.status !== "done" && w.status !== "approved") {
      analyses.push({
        workItemId: w.id,
        title: w.title,
        type,
        statusLabel: w.status_label ?? null,
        dueAt: w.due_at ?? null,
        family: w.status === "paused" ? "pause" : "and",
      });
    }
  }
  docs.sort((a, b) => newest(a.at, b.at));
  analyses.sort((a, b) => newest(works.find((w) => w.id === a.workItemId)?.created_at ?? "", works.find((w) => w.id === b.workItemId)?.created_at ?? ""));

  // Oportunidades: as do diagnóstico (02.01) mais recente com versão, da prioridade alta para a baixa.
  const dx = docs.find((d) => d.type === "02.01") ?? null;
  const dxVersion = dx ? latestVersion(byId.get(dx.workItemId)!) : null;
  const opportunities = l(o(dxVersion?.content).oportunidades)
    .map((x) => o(x))
    .map((x) => ({ titulo: s(x.titulo), descricao: s(x.descricao), prioridade: priorityOf(x.prioridade) }))
    .filter((x) => x.titulo)
    .map((x, i) => ({ x, i }))
    .sort((a, b) => (RANK[a.x.prioridade ?? "baixa"] - RANK[b.x.prioridade ?? "baixa"]) || a.i - b.i)
    .map(({ x }) => x);

  // Direção: só com um posicionamento (02.02) aprovado; o mais recente vale.
  let direction: StrategyDirection | null = null;
  const positioning = bia
    .filter((w) => w.delivery_type === "02.02")
    .map((w) => ({ w, d: byId.get(w.id) }))
    .map(({ w, d }) => ({ w, d, v: d ? approvedVersion(d) : null }))
    .filter((x) => x.v && s(o(x.v.content).posicionamento))
    .sort((a, b) => newest(a.v!.created_at, b.v!.created_at))[0];
  if (positioning?.v && positioning.d) {
    const c = o(positioning.v.content);
    const decided = positioning.d.approvals
      .filter((a) => a.delivery_version_id === positioning.v!.id && a.decided_at)
      .map((a) => a.decided_at!)
      .sort(newest)[0];
    const objetivo = o(l(c.objetivos)[0]);
    const plan = bia
      .filter((w) => w.delivery_type === "02.03")
      .map((w) => byId.get(w.id))
      .map((d) => (d ? approvedVersion(d) : null))
      .filter((v): v is Version => !!v)
      .sort((a, b) => newest(a.created_at, b.created_at))[0];
    const firstAction = plan
      ? l(o(plan.content).acoes)
          .map((x) => o(x))
          .sort((a, b) => Number(a.ordem ?? 0) - Number(b.ordem ?? 0))[0]
      : undefined;
    direction = {
      workItemId: positioning.w.id,
      title: s(c.titulo) || positioning.w.title,
      posicionamento: s(c.posicionamento),
      approvedAt: decided ?? positioning.v.created_at,
      objetivo: s(objetivo.objetivo) ? { objetivo: s(objetivo.objetivo), indicador: s(objetivo.indicador), prazo: s(objetivo.prazo) } : null,
      publico: s(o(l(c.publicos)[0]).nome) || null,
      prioridade: firstAction && s(firstAction.acao) ? { acao: s(firstAction.acao), horizonte: s(firstAction.horizonte) } : null,
    };
  }

  return {
    hasWork: true,
    direction,
    opportunities,
    opportunitySource: dx && opportunities.length ? { workItemId: dx.workItemId, title: dx.title, version: dx.version, at: dx.at } : null,
    analyses,
    docs,
  };
}
