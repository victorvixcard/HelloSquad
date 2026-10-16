"use client";

import { getAgent, PRODUCT_ICONS } from "@hellosquad/ui";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useShell } from "@/components/product/shell-context";
import { EnvIdentity } from "../EnvIdentity";
import { NeedsStrip, type StripNeed } from "../NeedsStrip";
import type { KiwiWork } from "./growth-types";
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
export function GrowthEnvironment({ business, needs, paid = [] }: { business: string; needs: StripNeed[]; paid?: KiwiWork[] }) {
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
              {/* Na V4.6 aqui vêm os números ilustrativos; o vazio leva às conexões, como o de Resultados. */}
              <div style={{ marginTop: 16 }}>
                <Link className="hm-btn is-dark is-s" href={`/app/${shell.workspace.slug}/memoria-da-marca`}>
                  {t("connections")}
                </Link>
              </div>
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
        {lane === "paid" && paid.length ? <PaidCards items={paid} /> : <p className="v41-cd-e">{t(`lane.${lane}.empty`)}</p>}
      </section>
    </div>
  );
}

/**
 * Cartões de "Campanhas pagas" (template L5417, `kw-c`): um por plano de mídia (05.01) ou teste de anúncios (05.02),
 * com o que a Kiwi escreveu e o link para o documento. Aprovar não autoriza investir: a autorização é própria (Fase 3).
 */
function PaidCards({ items }: { items: KiwiWork[] }) {
  const tg = useTranslations("growth");
  const format = useFormatter();
  const brl = (v: number | null) => (v === null ? "—" : format.number(v, { style: "currency", currency: "BRL", maximumFractionDigits: 0 }));
  const channel = (c: string) => (c === "meta_ads" || c === "google_ads" ? tg(`channel.${c}`) : c);
  const variable = (v: string) => (["publico", "mensagem", "criativo", "formato"].includes(v) ? tg(`variable.${v}`) : v);
  return (
    <div className="kw-camps">
      {items.map((w) => {
        const tag = w.state === "you" || w.state === "auth" ? "you" : w.state === "pause" ? "pause" : "prog";
        const facts: Array<[string, string]> =
          w.kind === "plan"
            ? [
                [tg("paid.budget"), `${tg("paid.budgetV", { value: brl(w.ceiling), period: w.period })} · ${tg("paid.proposed")}`],
                [tg("paid.split"), w.split.map((x) => `${channel(x.channel)} ${brl(x.value)}`).join(" · ")],
                [tg("paid.goal"), w.goal],
                [tg("paid.audience"), w.audience.join(" · ")],
              ]
            : [[tg("paid.audiences"), w.audiences.join(" · ")]];
        return (
          <article className="kw-c" key={w.id} aria-label={w.title}>
            <header className="kw-c-h">
              <b>{w.title}</b>
              <span className={`v41-tag is-${tag}`}>
                <span>{tg(`state.${w.state === "act" ? "prog" : w.state}`)}</span>
              </span>
            </header>
            <span className="ka-k">{w.kind === "plan" ? tg("paid.plan") : tg("paid.tests")}</span>
            <div className="kw-c-b">
              <dl className="kw-c-f">
                {facts
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
              </dl>
            </div>
            {w.kind === "plan" && w.limits.length ? (
              <div className="kw-c-l">
                <span className="ka-k">{tg("paid.limits")}</span>
                <ul>
                  {w.limits.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {w.kind === "tests" && w.tests.length ? (
              <div className="kw-c-l">
                <span className="ka-k">{tg("paid.testList")}</span>
                <ol>
                  {w.tests.map((x, i) => (
                    <li key={i}>
                      <b>{x.hypothesis}</b>{" "}
                      <small>
                        {tg("paid.testMeta", {
                          variable: variable(x.variable),
                          duration: x.duration,
                          budget: x.budget === null ? tg("paid.noBudget") : brl(x.budget),
                        })}
                      </small>
                    </li>
                  ))}
                </ol>
                {w.plan ? <small>{tg("paid.fromPlan", { no: w.plan.no, value: brl(w.plan.ceiling) })}</small> : null}
              </div>
            ) : null}
            <p className="kw-c-r">{w.kind === "plan" ? tg("exec.plan") : tg("exec.tests")}</p>
            <div className="kw-c-a">
              <Link className={w.awaiting ? "hm-btn is-dark is-s" : "hm-link"} href={w.href}>
                <span>{w.awaiting && w.kind === "plan" ? tg("paid.review") : tg("paid.see")}</span>
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
