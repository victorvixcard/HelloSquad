import { AGENT_IDS, isAgentId, type AgentId } from "@hellosquad/ui";

/**
 * Estado ao vivo do squad (A1a): o que chega pelo canal privado `workspace:<id>` do Realtime.
 * O banco publica ids e estados, nunca o conteúdo (S1a): o texto da mensagem, a entrega e a pendência
 * vêm da API depois. Puro e sem efeito colateral, para testar ordem, repetição e isolamento.
 */

/** Linha de `run_events` como o trigger `app.run_events_broadcast` publica (S1a). */
export type RunEventPayload = {
  id: string;
  run_id: string;
  seq: number;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

/** Aprovação como o trigger `app.approvals_broadcast` publica: evento `approval.created` ou `approval.<status>`. */
export type ApprovalPayload = {
  id: string;
  work_item_id: string;
  kind: string;
  status: string;
  requested_by_agent_id?: string;
  decision?: string;
};

export type Connection = "connecting" | "live" | "lost";

export type LiveRun = {
  id: string;
  /** Dono do run (o especialista da entrega): `started`. */
  owner: AgentId | null;
  /** Quem está trabalhando agora (`agent.thinking`); null antes da primeira etapa. */
  agent: AgentId | null;
  /** Etapa em curso ("nexo.triage", "otto.produce", "otto.check", "otto.revise"); null entre etapas. */
  step: string | null;
  status: "running" | "succeeded" | "failed";
  lastSeq: number;
  conversationId: string | null;
  workItemId: string | null;
  /** A pessoa pediu ajuste ou nova proposta: o especialista refaz uma versão (texto "ajustando"). */
  revision: boolean;
};

export type PendingApproval = { id: string; agent: AgentId; kind: string; workItemId: string };

export type LiveState = {
  workspaceId: string;
  connection: Connection;
  runs: Record<string, LiveRun>;
  pending: Record<string, PendingApproval>;
  /** Aprovações já decididas vistas pelo canal (repetição não muda nada). */
  decided: Record<string, string>;
  /** Mensagem nova de agente por conversa (a conversa aberta busca o texto na API). */
  messages: Record<string, number>;
  /** Sobe quando o servidor tem dado novo para a casca (faixa, badge, resumo de Trabalhos). */
  version: number;
};

export type LiveAction =
  | { type: "run_event"; workspaceId: string; event: RunEventPayload }
  | { type: "approval"; workspaceId: string; event: string; approval: ApprovalPayload }
  | {
      type: "run_linked";
      workspaceId: string;
      runId: string;
      conversationId: string | null;
      workItemId: string | null;
      owner?: AgentId | null;
      revision?: boolean;
    }
  | { type: "connection"; status: Connection }
  | { type: "pending_synced"; workspaceId: string; pending: PendingApproval[] };

export function initialLiveState(workspaceId: string, pending: PendingApproval[] = []): LiveState {
  return {
    workspaceId,
    connection: "connecting",
    runs: {},
    pending: Object.fromEntries(pending.map((p) => [p.id, p])),
    decided: {},
    messages: {},
    version: 0,
  };
}

const agentOf = (value: unknown): AgentId | null => (typeof value === "string" && isAgentId(value) ? value : null);

function blankRun(id: string): LiveRun {
  return { id, owner: null, agent: null, step: null, status: "running", lastSeq: 0, conversationId: null, workItemId: null, revision: false };
}

/** Eventos que mudam o que o servidor mostra: a casca relê a API (faixa, badge, Trabalhos, detalhe). */
const REFRESH = new Set(["delivery.created", "approval.requested", "message.created", "memory.suggested", "finished", "failed"]);

function applyRunEvent(state: LiveState, event: RunEventPayload): LiveState {
  const prev = state.runs[event.run_id] ?? blankRun(event.run_id);
  // Idempotência e ordem: o canal pode repetir (reconexão + fallback pela API); seq só anda para frente.
  if (event.seq <= prev.lastSeq) return state;
  const run: LiveRun = { ...prev, lastSeq: event.seq };
  const data = event.payload ?? {};
  switch (event.type) {
    case "started":
      run.owner = agentOf(data.agent_id) ?? run.owner;
      run.status = "running";
      break;
    case "agent.thinking":
      run.agent = agentOf(data.agent_id) ?? run.agent;
      run.step = typeof data.step === "string" ? data.step : run.step;
      run.status = "running";
      break;
    case "step.done":
      run.step = null;
      break;
    case "finished":
      run.status = "succeeded";
      run.step = null;
      break;
    case "failed":
      run.status = "failed";
      run.step = null;
      break;
    case "message.created":
      if (typeof data.conversation_id === "string") run.conversationId = run.conversationId ?? data.conversation_id;
      break;
    default:
      break;
  }
  const next: LiveState = { ...state, runs: { ...state.runs, [run.id]: run } };
  if (event.type === "message.created" && typeof data.conversation_id === "string") {
    next.messages = { ...state.messages, [data.conversation_id]: (state.messages[data.conversation_id] ?? 0) + 1 };
  }
  if (event.type === "approval.requested" && typeof data.approval_id === "string" && run.workItemId) {
    const agent = run.agent ?? run.owner;
    if (agent) {
      next.pending = {
        ...state.pending,
        [data.approval_id]: { id: data.approval_id, agent, kind: String(data.kind ?? ""), workItemId: run.workItemId },
      };
    }
  }
  if (REFRESH.has(event.type)) next.version = state.version + 1;
  return next;
}

function applyApproval(state: LiveState, approval: ApprovalPayload): LiveState {
  const agent = agentOf(approval.requested_by_agent_id);
  if (approval.status === "pending") {
    // `approval.created` repetido, ou já visto pelo `approval.requested` do run: nada muda.
    if (!agent || state.pending[approval.id]) return state;
    const pending = { ...state.pending, [approval.id]: { id: approval.id, agent, kind: approval.kind, workItemId: approval.work_item_id } };
    return { ...state, pending, version: state.version + 1 };
  }
  // Decidida (ou expirada): sai da faixa. Repetir a mesma decisão não muda nada.
  if (state.decided[approval.id] === approval.status) return state;
  const pending = { ...state.pending };
  delete pending[approval.id];
  return { ...state, pending, decided: { ...state.decided, [approval.id]: approval.status }, version: state.version + 1 };
}

export function liveReducer(state: LiveState, action: LiveAction): LiveState {
  switch (action.type) {
    case "connection":
      return action.status === state.connection ? state : { ...state, connection: action.status };
    case "run_event":
      // Canal de outro workspace (troca de negócio com evento atrasado): ignora.
      if (action.workspaceId !== state.workspaceId) return state;
      return applyRunEvent(state, action.event);
    case "approval":
      if (action.workspaceId !== state.workspaceId) return state;
      return applyApproval(state, action.approval);
    case "run_linked": {
      if (action.workspaceId !== state.workspaceId) return state;
      const prev = state.runs[action.runId] ?? blankRun(action.runId);
      const run: LiveRun = {
        ...prev,
        conversationId: action.conversationId ?? prev.conversationId,
        workItemId: action.workItemId ?? prev.workItemId,
        owner: action.owner ?? prev.owner,
        revision: action.revision ?? prev.revision,
      };
      return { ...state, runs: { ...state.runs, [run.id]: run } };
    }
    case "pending_synced": {
      if (action.workspaceId !== state.workspaceId) return state;
      return { ...state, pending: Object.fromEntries(action.pending.map((p) => [p.id, p])) };
    }
    default:
      return state;
  }
}

// ------------------------------------------------------------------ status vivo dos sete (V4.6)

/** Modos do protótipo (`_modes`, L8049): idle, work, wait, live. `monitor` e `sleep` vêm de rotinas (Fase 3). */
export type AgentMode = "idle" | "work" | "wait" | "live";

export function runningRuns(state: LiveState): LiveRun[] {
  return Object.values(state.runs).filter((r) => r.status === "running");
}

/**
 * Modo de cada agente derivado dos runs em execução e das pendências, como o `_modes` da V4.6:
 * quem trabalha numa etapa fica `work`; quem pede decisão fica `wait` (vence o `work`, como no protótipo);
 * o Nexo coordena (`live`) enquanto alguém trabalha ou espera, e fica `wait` quando a pergunta é dele.
 */
export function agentModes(state: LiveState): Record<AgentId, AgentMode> {
  const modes = Object.fromEntries(AGENT_IDS.map((a) => [a, "idle"])) as Record<AgentId, AgentMode>;
  let anyRun = false;
  for (const run of runningRuns(state)) {
    anyRun = true;
    if (run.agent && run.agent !== "nexo") modes[run.agent] = "work";
  }
  for (const p of Object.values(state.pending)) modes[p.agent] = "wait";
  if (modes.nexo !== "wait" && (anyRun || AGENT_IDS.some((a) => a !== "nexo" && modes[a] !== "idle"))) modes.nexo = "live";
  return modes;
}

/** Chave do rótulo curto (`_shortNow`, L8063): o texto está no catálogo (`live.short.*`). */
export function shortNowKey(agent: AgentId, mode: AgentMode): string {
  if (mode === "work") return ({ bia: "researching", kaia: "creating", otto: "writing" } as Partial<Record<AgentId, string>>)[agent] ?? "working";
  return { wait: "waiting", live: "coordinating", idle: "available" }[mode];
}

/** Expressão do rosto para o modo (V4.6: "big" quando aguarda você; olhos trabalhando em `work`). */
export function modeExpression(mode: AgentMode): { expression: "big" | "oval"; thinking: boolean } {
  return { expression: mode === "wait" ? "big" : "oval", thinking: mode === "work" };
}

// ------------------------------------------------------------------ status da conversa

/** Status vivo de uma conversa (`SquadStatus` do DS dentro de `.ps-cstat`, V4.6 L5523). */
export type ConversationLive =
  | { kind: "work"; lead: AgentId; detail: "organizing" | "creatingFirst" | "adjusting"; typing: AgentId | null }
  | null;

/**
 * O run em execução ligado à conversa vira o status: Nexo "organizando seu pedido" na triagem (L6828);
 * o especialista "criando a primeira versão" (L6741) ou "ajustando" quando a pessoa pediu ajuste (L6775).
 * "<Nome> está escrevendo" (L8540) aparece enquanto um agente está numa etapa.
 */
export function conversationLive(state: LiveState, conversationId: string | null): ConversationLive {
  if (!conversationId) return null;
  const run = runningRuns(state)
    .filter((r) => r.conversationId === conversationId)
    .sort((a, b) => b.lastSeq - a.lastSeq)[0];
  if (!run) return null;
  const lead = run.agent ?? "nexo";
  if (lead === "nexo") return { kind: "work", lead, detail: "organizing", typing: run.step ? "nexo" : null };
  return { kind: "work", lead, detail: run.revision ? "adjusting" : "creatingFirst", typing: run.step ? lead : null };
}
