import { Agent, CommandField, getAgent, type AgentId } from "@hellosquad/ui";
import type { ReactNode } from "react";

type EmptyPageProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  /** Especialista do ambiente: aparece com a cor e os olhos dele (o agente está presente). */
  agent?: AgentId;
  /** Vários agentes presentes (Sala do Squad). */
  agents?: readonly AgentId[];
  /** Texto do campo de pedido. */
  placeholder?: string;
};

/**
 * Página ainda sem conteúdo: estado vazio honesto (nada inventado) e o campo de pedido
 * indisponível até o squad responder (Fase 1).
 */
export function EmptyPage({ eyebrow, title, description, agent, agents, placeholder }: EmptyPageProps) {
  const member = agent ? getAgent(agent) : null;
  return (
    <>
      <header className="pg-head">
        {member ? (
          <div className="pg-id">
            <Agent agent={member.id} size={56} />
            <div className="pg-id-t">
              <p className="hs-label">
                {member.name} · {member.roleFull}
              </p>
              <h1>{title}</h1>
            </div>
          </div>
        ) : (
          <>
            <p className="hs-label">{eyebrow}</p>
            <h1>{title}</h1>
          </>
        )}
        {description ? <p className="pg-desc">{description}</p> : null}
      </header>
      <section className="pg-empty" aria-labelledby="vazio-titulo">
        {agents?.length ? (
          <div className="pg-squad" role="list" aria-label="Especialistas na sala">
            {agents.map((id) => (
              <span key={id} role="listitem">
                <Agent agent={id} size={36} title={getAgent(id).name} />
              </span>
            ))}
          </div>
        ) : null}
        <p className="pg-empty-t" id="vazio-titulo">
          Nada aqui ainda. Comece pedindo algo ao squad.
        </p>
        <CommandField disabled placeholder={placeholder} note="Disponível na Fase 1." />
      </section>
    </>
  );
}
