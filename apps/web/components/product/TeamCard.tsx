"use client";

import { Agent, getAgent, Icon, isAgentId, type AgentId } from "@hellosquad/ui";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useShell } from "./shell-context";

type Member = { agent_id: string; responsibility?: string | null };

/**
 * Cartão da equipe que o Nexo montou (V4.6 L5541, `isTeam`; dados em L8626; S2d cartão `team`): "Squad da campanha ·
 * o Nexo coordena", uma linha por especialista com a responsabilidade dele e "Abrir o projeto", que leva ao trabalho
 * coordenado (a V4.6 abre o trabalho da campanha, `_openWork('w-camp')`).
 */
export function TeamCard({ members, workItemId }: { members: Member[]; workItemId: string | null }) {
  const t = useTranslations("conversation.team");
  const shell = useShell();
  const router = useRouter();
  const rows = members.filter((m): m is Member & { agent_id: AgentId } => isAgentId(m.agent_id));
  return (
    <div className="ps-card">
      <span className="ps-card-k">{t("kicker")}</span>
      <div className="ps-team">
        {rows.map((m) => (
          <div className="ps-team-r" key={m.agent_id}>
            <Agent agent={m.agent_id} size={24} />
            <b>{getAgent(m.agent_id).name}</b>
            {m.responsibility ? <span>{m.responsibility}</span> : null}
          </div>
        ))}
      </div>
      {workItemId ? (
        <button type="button" className="ps-link" onClick={() => router.push(`/app/${shell.workspace.slug}/squad/nexo/trabalho/${workItemId}`)}>
          <span>{t("open")}</span>
          <Icon name="arrow" size={16} strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}
