import { isAgentId, type AgentId } from "@hellosquad/ui";
import type { Conversation, WorkItemDetail } from "@/lib/core";

/**
 * Um acontecimento do trabalho, montado só do que `GET /work-items/{id}` devolve: o pedido (quem criou e em que
 * conversa), as etapas, os runs (começou, falhou), as versões entregues e as decisões já tomadas. Nada inventado.
 */
export type WorkEvent =
  | { kind: "asked"; at: string; where: "direct" | "room" | "plain"; agent: AgentId | null }
  | { kind: "step"; at: string; agent: AgentId | null; title: string }
  | { kind: "started"; at: string; agent: AgentId }
  | { kind: "failed"; at: string; agent: AgentId }
  | { kind: "delivered"; at: string; agent: AgentId | null; version: number }
  | {
      kind: "decided";
      at: string;
      decision: "approved" | "rejected" | "changes_requested" | "answered";
      followUp: "cancel" | "revise" | null;
      note: string | null;
      version: number | null;
    };

/** Onde o pedido nasceu (V4.6 `origin`, L9164/L9211): conversa com um especialista, Sala do Squad ou outra. */
export type Origin = { where: "direct" | "room" | "plain"; agent: AgentId | null; at: string };

export function originOf(item: Pick<WorkItemDetail, "created_at" | "primary_agent_id">, conversation: Pick<Conversation, "kind" | "primary_agent_id"> | null): Origin {
  const agent = conversation?.primary_agent_id && isAgentId(conversation.primary_agent_id) ? conversation.primary_agent_id : null;
  if (conversation?.kind === "squad_room") return { where: "room", agent: null, at: item.created_at };
  if (conversation?.kind === "agent_direct" && agent) return { where: "direct", agent, at: item.created_at };
  return { where: "plain", agent: isAgentId(item.primary_agent_id) ? item.primary_agent_id : null, at: item.created_at };
}

/** Histórico do trabalho, do mais recente para o mais antigo (como a V4.6 mostra, `hist.slice().reverse()`). */
export function workEvents(item: WorkItemDetail, origin: Origin, viewerId: string | null): WorkEvent[] {
  const events: WorkEvent[] = [];
  // O pedido é "Você pediu…" só para quem pediu: a V4.6 tem uma pessoa só e não desenha o pedido de outro membro.
  if (item.created_by && viewerId && item.created_by === viewerId) {
    events.push({ kind: "asked", at: item.created_at, where: origin.where, agent: origin.agent });
  }
  for (const s of item.steps) {
    const at = s.finished_at ?? s.started_at;
    if (at) events.push({ kind: "step", at, agent: s.agent_id && isAgentId(s.agent_id) ? s.agent_id : null, title: s.title });
  }
  for (const r of item.runs) {
    if (!isAgentId(r.agent_id)) continue;
    if (r.started_at) events.push({ kind: "started", at: r.started_at, agent: r.agent_id });
    if (r.status === "failed" && r.finished_at) events.push({ kind: "failed", at: r.finished_at, agent: r.agent_id });
  }
  for (const d of item.deliveries) {
    for (const v of d.versions) {
      const agent = v.created_by_agent_id && isAgentId(v.created_by_agent_id) ? v.created_by_agent_id : null;
      events.push({ kind: "delivered", at: v.created_at, agent, version: v.version_no });
    }
  }
  for (const a of item.approvals) {
    if (a.status !== "decided" || !a.decision || !a.decided_at) continue;
    events.push({
      kind: "decided",
      at: a.decided_at,
      decision: a.decision,
      followUp: a.follow_up ?? null,
      note: a.note,
      version: a.delivery_version_no,
    });
  }
  // Ordem estável: mais recente primeiro; no mesmo instante, a ordem em que aconteceram fica de cabeça para baixo.
  return events
    .map((e, i) => ({ e, i, t: Date.parse(e.at) }))
    .sort((a, b) => b.t - a.t || b.i - a.i)
    .map((x) => x.e);
}
