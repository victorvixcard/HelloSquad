"use client";

import { Agent, getAgent, PRODUCT_ICONS, type AgentId } from "@hellosquad/ui";
import { useTranslations } from "next-intl";
import { useLive } from "@/components/product/live";
import { useShell } from "@/components/product/shell-context";
import { CapCatalog } from "./CapCatalog";

/**
 * A conversa do ambiente (V4.6 `_openCtx('env', id)`, L9776): uma por ambiente e separada da direta, com a primeira
 * fala do agente e as sugestões do ambiente (API da S2a, `context_type: environment`). O objeto leva o nome curto do
 * ambiente, o mesmo da barra lateral (V4.6 `ENVS[id].l`; "Growth" na Kiwi, H2-31); o título da tela segue a área
 * ("Growth Marketing", decisão do dono).
 */
export function useEnvConversation(agent: AgentId, business: string) {
  const t = useTranslations("pages.env");
  const ts = useTranslations("shell");
  const shell = useShell();
  const member = getAgent(agent);
  const name = ts(`areas.${agent}`);
  const open = () =>
    shell.openConversation({
      conversationId: null,
      agent,
      context: {
        kind: "env",
        label: name,
        href: `/app/${shell.workspace.slug}/squad/${agent}`,
        meta: `${member.name} ${t(`describe.${agent}`, { business })}`,
        ref: { type: "environment", key: agent, title: name },
      },
    });
  return { name, open };
}

/** Camada de identidade dos ambientes V4: o especialista, o título, uma frase, o catálogo do que pedir e a conversa do ambiente. */
export function EnvIdentity({ agent, business }: { agent: AgentId; business: string }) {
  const t = useTranslations("pages.env");
  const tc = useTranslations("common");
  const member = getAgent(agent);
  const area = tc(`areas.${agent}`);
  const env = useEnvConversation(agent, business);
  // V4.6 `_vId` (L10569): o rosto segue o modo ao vivo do especialista: "big" quando aguarda você, olhos
  // trabalhando quando está numa etapa (runs e pendências pelo Realtime).
  const mode = useLive().modes[agent];
  return (
    <header className="v4-id">
      <span className="v4-id-av" aria-hidden="true">
        <Agent agent={agent} size={44} expression={mode === "wait" ? "big" : "oval"} thinking={mode === "work"} />
      </span>
      <div className="v4-id-t">
        <h1 className="v4-h1">{area}</h1>
        <p className="v4-id-d">
          <b>{member.name}</b> {t(`describe.${agent}`, { business })}
        </p>
      </div>
      <CapCatalog agent={agent} />
      {/* H1-04 (V4.6 L10572): "Conversar com <Nome> sobre <ambiente>, ao lado", com o nome curto do ambiente. */}
      <button type="button" className="hm-btn is-dark is-s v4-talk" aria-label={t("talkAria", { name: member.name, area: env.name })} onClick={env.open}>
        <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
          <path d={PRODUCT_ICONS.ask} />
        </svg>
        <span>{t("talk", { name: member.name })}</span>
      </button>
    </header>
  );
}
