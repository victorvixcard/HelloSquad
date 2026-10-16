"use client";

import { Agent, getAgent, Icon, type AgentId } from "@hellosquad/ui";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export type StripNeed = {
  approvalId: string;
  agent: AgentId;
  /** "Para você revisar"… */
  kind: string;
  title: string;
  sub: string;
  cta: string;
  href: string;
};

/**
 * Faixa "Precisa de você" da V4.6, igual em todos os ambientes: Tinta, uma linha, quem pede (rosto + nome),
 * o tipo de decisão em mono, o título, o contexto e a ação. Uma pendência por ambiente; "+N" abre as demais.
 */
export function NeedsStrip({ items }: { items: StripNeed[] }) {
  const t = useTranslations("pages.needs");
  const router = useRouter();
  if (!items.length) return null;
  const top = items[0];
  const who = getAgent(top.agent).name;
  return (
    <section className="nd" aria-label={t("labelCount", { count: items.length })}>
      <div className="nd-r is-first">
        <button
          type="button"
          className="nd-b"
          aria-label={t("itemAria", { who, kind: top.kind, title: top.title, cta: top.cta })}
          onClick={() => router.push(top.href)}
        >
          <span className="nd-k">
            <span className="nd-av" aria-hidden="true">
              <Agent agent={top.agent} size={20} expression="oval" />
            </span>
            <span className="nd-kt">
              <b>{who}</b>
              <span> · {top.kind}</span>
            </span>
          </span>
          <b className="nd-t">{top.title}</b>
          <small className="nd-s">{top.sub}</small>
          <span className="nd-l">
            <span>{top.cta}</span>
            <Icon name="arrow" size={14} strokeWidth={2} />
          </span>
        </button>
      </div>
    </section>
  );
}
