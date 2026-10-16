import { cx } from "../cx";
import { getAgent, type AgentId } from "../squad";

export type AgentDotProps = {
  agent: AgentId;
  /** Diâmetro em px; o padrão (7) é o ponto dos chips do DS. */
  size?: number;
  /** Nome acessível. Sem ele, o ponto é decorativo: o nome do agente deve estar no texto ao lado. */
  label?: string;
  className?: string;
};

/** A cor de um agente num ponto. Só aparece onde o agente está presente. */
export function AgentDot({ agent, size = 7, label, className }: AgentDotProps) {
  const member = getAgent(agent);
  return (
    <span
      className={cx("hs-agent-dot", className)}
      style={{ background: member.color, width: size, height: size }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-agent={agent}
    />
  );
}
