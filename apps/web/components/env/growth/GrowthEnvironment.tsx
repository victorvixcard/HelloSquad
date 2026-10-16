"use client";

import { getAgent, PRODUCT_ICONS } from "@hellosquad/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useShell } from "@/components/product/shell-context";
import { EnvIdentity } from "../EnvIdentity";
import { NeedsStrip, type StripNeed } from "../NeedsStrip";
import "./growth.css";

type Lane = "org" | "paid" | "cro";
/** As três frentes da V4.3 (`kw.lanes`, L12153), na mesma ordem e com os mesmos ícones. */
const LANES: readonly Lane[] = ["org", "paid", "cro"];
const LANE_ICON: Record<Lane, string> = { org: PRODUCT_ICONS.search, paid: PRODUCT_ICONS.insta, cro: PRODUCT_ICONS.pulse };

/**
 * Growth Marketing · Kiwi (template L5399). No primeiro acesso a V4.6 repete os números ilustrativos da conta em
 * uso; aqui nada é inventado (Documento Mestre §7 e §12): o objetivo de crescimento fica vazio até existir um,
 * o vazio pede a conexão ou a planilha, e as três frentes mantêm só o que é estrutura e regra ("Nenhum anúncio no
 * ar. Nada é investido nem ativado sem a sua autorização."). As ações de cada frente abrem a conversa com a Kiwi.
 */
export function GrowthEnvironment({ business, needs }: { business: string; needs: StripNeed[] }) {
  const t = useTranslations("envs.kiwi");
  const tp = useTranslations("pages.env");
  const tc = useTranslations("common");
  const shell = useShell();
  const kiwi = getAgent("kiwi");
  const [lane, setLane] = useState<Lane>("org");
  const ids = useId();
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const nar = shell.layout.contentW < 1040 ? " is-nar" : "";
  const tabId = (l: Lane) => `${ids}-tab-${l}`;
  const paneId = `${ids}-pane`;
  const talk = (l: Lane) =>
    shell.openConversation({
      conversationId: shell.conversationIds.direct.kiwi ?? null,
      agent: "kiwi",
      context: {
        kind: "env",
        label: tc("areas.kiwi"),
        href: `/app/${shell.workspace.slug}/squad/kiwi`,
        meta: `${kiwi.name} ${tp("describe.kiwi", { business })}`,
        origin: t(`lane.${l}.label`),
      },
      draft: t(`lane.${l}.ask`),
    });
  // Abas com setas, Home e End (padrão de tablist); a V4.6 só troca no clique.
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = LANES.length;
    const to = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    setLane(LANES[to]!);
    tabs.current[to]?.focus();
  };

  return (
    <div className={`ps-v is-wide v4 kw${nar}`} style={{ maxWidth: shell.layout.contentW }}>
      <EnvIdentity agent="kiwi" business={business} />
      <NeedsStrip items={needs} />
      <section className="kw-top" aria-labelledby="kw-goal-t">
        <div className="kw-goal">
          <div className="kw-gh">
            <div className="kw-gh-m">
              <span className="ka-k">{t("goalKicker")}</span>
              <h2 id="kw-goal-t">{t("emptyTitle")}</h2>
              <p>{t("emptyText")}</p>
              <span className="kw-empty-a">
                <Link className="hm-btn is-dark is-s" href={`/app/${shell.workspace.slug}/memoria-da-marca`}>
                  {t("connections")}
                </Link>
              </span>
            </div>
          </div>
        </div>
      </section>
      <div className="kw-lanes" role="tablist" aria-label={t("lanes")}>
        {LANES.map((l, i) => (
          <button
            key={l}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId(l)}
            className={`kw-lane${lane === l ? " is-on" : ""}`}
            aria-selected={lane === l}
            aria-controls={paneId}
            tabIndex={lane === l ? 0 : -1}
            onClick={() => setLane(l)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span className="kw-l-h">
              <svg className="ps-ic" viewBox="0 0 18 18" aria-hidden="true">
                <path d={LANE_ICON[l]} />
              </svg>
              <span>{t(`lane.${l}.label`)}</span>
            </span>
            <b>{t(`lane.${l}.value`)}</b>
            <small>{t(`lane.${l}.sub`)}</small>
          </button>
        ))}
      </div>
      <section className="kw-pane" role="tabpanel" id={paneId} aria-labelledby={tabId(lane)}>
        <header className="kw-ph">
          <div>
            <h2>{t(`lane.${lane}.label`)}</h2>
            <p>{t(`lane.${lane}.text`, { business })}</p>
          </div>
          <button type="button" className="hm-btn is-soft is-s" onClick={() => talk(lane)}>
            <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
              <path d={PRODUCT_ICONS.capa} />
            </svg>
            <span>{t(`lane.${lane}.action`)}</span>
          </button>
        </header>
        <p className="v41-cd-e">{t(`lane.${lane}.empty`)}</p>
      </section>
    </div>
  );
}
