import { AGENT_SHAPES, EXPRESSIONS, SQUAD } from "./generated/agents";

export type SquadMember = (typeof SQUAD)[number];
export type AgentId = SquadMember["id"];
export type AgentShape = keyof typeof AGENT_SHAPES;
export type AgentExpression = (typeof EXPRESSIONS)[number];

/** Os sete agentes na ordem oficial do DS: nexo, bia, kaia, otto, kiwi, max, iris. */
export const AGENT_IDS: readonly AgentId[] = SQUAD.map((member) => member.id);

export function isAgentId(value: string): value is AgentId {
  return (AGENT_IDS as readonly string[]).includes(value);
}

export function getAgent(id: AgentId): SquadMember {
  const member = SQUAD.find((m) => m.id === id);
  if (!member) throw new Error(`Agente desconhecido: ${id}`);
  return member;
}

/** "o Nexo", "a Íris": o artigo vem de squad/<agente>/agent.yaml. */
export function withArticle(id: AgentId): string {
  const member = getAgent(id);
  return `${member.article} ${member.name}`;
}

export { AGENT_SHAPES, EXPRESSIONS, SQUAD };
