"use client";

import { Agent, getAgent, PRODUCT_ICONS, type AgentId } from "@hellosquad/ui";
import { useTranslations } from "next-intl";
import { useShell } from "@/components/product/shell-context";

/** Camada de identidade dos ambientes V4: o especialista, o título, uma frase e a conversa com ele. */
export function EnvIdentity({ agent, business }: { agent: AgentId; business: string }) {
  const t = useTranslations("pages.env");
  const tc = useTranslations("common");
  const shell = useShell();
  const member = getAgent(agent);
  const area = tc(`areas.${agent}`);
  const waiting = shell.conversation.target?.agent === agent && shell.conversation.mode !== "off";
  return (
    <header className="v4-id">
      <span className="v4-id-av" aria-hidden="true">
        <Agent agent={agent} size={44} expression={waiting ? "happy" : "oval"} />
      </span>
      <div className="v4-id-t">
        <h1 className="v4-h1">{area}</h1>
        <p className="v4-id-d">
          <b>{member.name}</b> {t(`describe.${agent}`, { business })}
        </p>
      </div>
      <div className="cap-w">
        <button
          type="button"
          className="hm-btn is-soft is-s cap-trig"
          aria-expanded={false}
          aria-label={t("askAria", { article: member.article, name: member.name })}
          onClick={() => shell.toast(tc("unavailable"), agent)}
        >
          <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
            <path d={PRODUCT_ICONS.capa} />
          </svg>
          <span>
            {t("ask")}
            <span className="cap-trig-ag">{t("askTo", { article: member.article, name: member.name })}</span>
          </span>
          <svg className="sb-ic cap-chev" viewBox="0 0 18 18" aria-hidden="true">
            <path d={PRODUCT_ICONS.chevD} />
          </svg>
        </button>
      </div>
      <button
        type="button"
        className="hm-btn is-dark is-s v4-talk"
        aria-label={t("talkAria", { name: member.name, area })}
        onClick={() =>
          shell.openConversation({
            conversationId: shell.conversationIds.direct[agent] ?? null,
            agent,
            context: { kind: "env", label: area, href: `/app/${shell.workspace.slug}/squad/${agent}` },
          })
        }
      >
        <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
          <path d={PRODUCT_ICONS.ask} />
        </svg>
        <span>{t("talk", { name: member.name })}</span>
      </button>
    </header>
  );
}
