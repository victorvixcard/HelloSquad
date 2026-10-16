import { AGENT_IDS, STATUS_GLYPHS, type AgentId } from "@hellosquad/ui";

/** Conversa da aba "Conversas", lida de `GET /workspaces/{id}/conversations` (só o que a API devolve). */
export type ChatRow = {
  id: string;
  kind: "squad_room" | "agent_direct" | "object";
  agent: AgentId | null;
  title: string | null;
  /** Objeto da conversa de objeto (`project`, `work_item`, `delivery`). */
  contextType: string | null;
  contextId: string | null;
  /** Atividade mais recente (última mensagem ou criação), ISO. */
  at: string;
  /** Última mensagem de pessoa ou agente, lida da API (`before=latest`); null quando não foi lida. */
  last: { by: "user" | "agent"; agent: AgentId | null; text: string } | null;
};

/** Trabalho do squad, lido de `GET /workspaces/{id}/work-items`. */
export type TeamWork = {
  id: string;
  title: string;
  status: string;
  agent: AgentId;
  collaborators: AgentId[];
  deliveryType: string | null;
  /** Versão que aguarda a decisão da pessoa (pendência aberta), quando há. */
  waitVersion: number | null;
  href: string;
};

/** Pendência aberta de um especialista ("Precisa de você"), para a frase "agora" do perfil. */
export type TeamPending = { agent: AgentId; workItemId: string; version: number | null; deliveryType: string | null };

/** Quem trabalha com quem (`AG[].with`, L5627–5684). */
export const WORKS_WITH: Record<AgentId, readonly AgentId[]> = {
  nexo: ["bia", "kaia", "otto", "kiwi", "max", "iris"],
  bia: ["kaia", "otto", "kiwi"],
  kaia: ["bia", "otto"],
  otto: ["kaia", "bia"],
  kiwi: ["kaia", "iris"],
  max: ["otto", "iris"],
  iris: ["kiwi", "max", "bia"],
};

/** Base de cada desenho no palco do DS (`D.agents[].bottom`), para alinhar os pés como o `SquadStage`. */
export const STAGE_BOTTOM: Record<AgentId, number> = { nexo: 150, bia: 160, kaia: 150, otto: 130, kiwi: 157, max: 138, iris: 140 };

/** Medidas do palco da equipe (`_vTeam`, L9391): 76, 64 ou 48 px pela largura do conteúdo. */
export function stageMetrics(contentW: number) {
  const size = contentW >= 1000 ? 76 : contentW >= 820 ? 64 : 48;
  const gap = Math.round(size * 0.62);
  return { size, gap, w: AGENT_IDS.length * size + (AGENT_IDS.length - 1) * gap, h: size + 58 };
}

/** Situação do trabalho → família visual da V4.6 (`stk6` + `WK_SG`, L13857 e L6394). */
export function statusGlyph(status: string): keyof typeof STATUS_GLYPHS {
  const map: Record<string, keyof typeof STATUS_GLYPHS> = {
    needs_you: "you",
    in_progress: "and",
    draft: "and",
    scheduled: "prog",
    approved: "done",
    done: "done",
    paused: "pause",
    blocked: "block",
    failed: "fail",
  };
  return map[status] ?? "and";
}

/** "Agora" do perfil (`_vTeam`): trabalhos em que o especialista está e que não terminaram, até 4. */
export function worksOf(works: TeamWork[], agent: AgentId): TeamWork[] {
  return works
    .filter((w) => (w.agent === agent || w.collaborators.includes(agent)) && !["done", "approved", "cancelled"].includes(w.status))
    .slice(0, 4);
}

/** "Entregas" do perfil (`_made`): o que o especialista entregou e você aprovou ou concluiu. */
export function madeBy(works: TeamWork[], agent: AgentId): TeamWork[] {
  return works.filter((w) => w.agent === agent && (w.status === "approved" || w.status === "done"));
}

/** Filtro da aba "Conversas" (`_vChats`, L9569): por avatar (Sala ou especialista) e pela busca no texto da linha. */
export function filterChats<T extends { row: ChatRow; text: string }>(rows: T[], q: string, who: AgentId | "squad" | null): T[] {
  const query = q.toLowerCase().trim();
  return rows.filter(
    ({ row, text }) =>
      (!who || (who === "squad" ? row.kind === "squad_room" : row.kind !== "squad_room" && row.agent === who)) &&
      (!query || text.toLowerCase().includes(query)),
  );
}
