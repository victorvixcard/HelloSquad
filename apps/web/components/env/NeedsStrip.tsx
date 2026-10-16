"use client";

import { Agent, getAgent, Icon, PRODUCT_ICONS, type AgentId } from "@hellosquad/ui";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useShell } from "@/components/product/shell-context";

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
  const tc = useTranslations("common");
  const router = useRouter();
  const { canDecide } = useShell();
  const [open, setOpen] = useState(false);
  const listId = useId();
  if (!items.length) return null;
  const [top, ...rest] = items;
  // V4.6 `_vNd5` (L13822): a primeira aparece; "+N" abre as demais logo abaixo, no mesmo formato, e vira "Fechar".
  const row = (x: StripNeed, first: boolean) => {
    const who = getAgent(x.agent).name;
    // Só o dono da conta decide: quem não é owner vê a pendência em modo leitura, sem a ação de decidir.
    const cta = canDecide ? x.cta : tc("ownerDecides");
    return (
      <button
        type="button"
        className="nd-b"
        aria-label={t("itemAria", { who, kind: x.kind, title: x.title, cta })}
        onClick={() => router.push(x.href)}
      >
        <span className="nd-k">
          <span className="nd-av" aria-hidden="true">
            <Agent agent={x.agent} size={20} expression="oval" />
          </span>
          <span className="nd-kt">
            <b>{who}</b>
            <span> · {x.kind}</span>
          </span>
        </span>
        <b className="nd-t">{x.title}</b>
        <small className="nd-s">{x.sub}</small>
        <span className="nd-l">
          <span>{cta}</span>
          {canDecide || !first ? <Icon name="arrow" size={14} strokeWidth={2} /> : null}
        </span>
      </button>
    );
  };
  return (
    <section className="nd" aria-label={t("labelCount", { count: items.length })}>
      <div className="nd-r is-first">
        {row(top!, true)}
        {rest.length ? (
          <button
            type="button"
            className="nd-m"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={open ? t("less") : t("more", { count: rest.length })}
            onClick={() => setOpen((v) => !v)}
          >
            <span>{open ? t("closeBtn") : t("moreBtn", { count: rest.length })}</span>
            <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
              <path d={PRODUCT_ICONS.chev} />
            </svg>
          </button>
        ) : null}
      </div>
      {rest.length ? (
        <div className={"v41-more" + (open ? " is-open" : "")} id={listId}>
          <div className="v41-more-in">
            <div className="nd-list">
              {rest.map((x) => (
                <div className="nd-r" key={x.approvalId}>
                  {row(x, false)}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
