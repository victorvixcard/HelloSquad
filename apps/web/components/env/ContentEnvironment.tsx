"use client";

import { Agent, getAgent, PRODUCT_ICONS } from "@hellosquad/ui";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useShell } from "@/components/product/shell-context";
import { EnvIdentity } from "./EnvIdentity";
import { NeedsStrip, type StripNeed } from "./NeedsStrip";
import { currentWeek } from "./week";


type View = "week" | "month" | "list";

/**
 * Conteúdo · Otto, as quatro camadas da V4.6: identidade com "Conversar com o Otto"; a visão protagonista
 * (calendário editorial); os componentes inteligentes (próximas publicações, desempenho orgânico e
 * "Otto percebeu" com contorno na cor do agente); e a conversa contextual (o painel universal).
 * Sem publicação, números ou oportunidades no banco ainda: cada parte mostra o estado vazio da própria V4.6.
 */
export function ContentEnvironment({ business, needs, now }: { business: string; needs: StripNeed[]; now?: Date }) {
  const t = useTranslations("content");
  const shell = useShell();
  const locale = useLocale();
  const [view, setView] = useState<View>("week");
  const [offset, setOffset] = useState(0);
  const otto = getAgent("otto");
  const base = now ?? new Date();
  const wk = currentWeek(new Date(base.getTime() + offset * 7 * 86_400_000), locale);
  const range =
    (wk.sameMonth
      ? t("rangeSame", { from: wk.from, to: wk.to, month: wk.month })
      : t("rangeCross", { from: wk.from, monthFrom: wk.monthFrom, to: wk.to, month: wk.month })) +
    (offset === 0 ? ` · ${t("thisWeek")}` : "");
  const talk = (agent: "otto" | "iris" | "kaia") =>
    shell.openConversation({
      conversationId: shell.conversationIds.direct[agent] ?? null,
      agent,
      context: agent === "otto" ? { kind: "env", label: t("work.back") } : undefined,
    });
  const tight = shell.layout.contentW < 1040;

  return (
    <div className="ps-v is-wide v4 ct" style={{ maxWidth: shell.layout.contentW }}>
      <EnvIdentity agent="otto" business={business} />
      <NeedsStrip items={needs} />
      <section className="v4-card v41-main ct-cal" aria-labelledby="ct-cal-t">
        <header className="ct-bar">
          <h2 id="ct-cal-t" className="ps-srl">
            {t("calendar")}
          </h2>
          <div className="v4-seg" role="group" aria-label={t("viewsLabel")}>
            {(["week", "month", "list"] as const).map((v) => (
              <button key={v} type="button" className={`v4-seg-b${view === v ? " is-on" : ""}`} aria-pressed={view === v} onClick={() => setView(v)}>
                {t(`views.${v}`)}
              </button>
            ))}
          </div>
          {view !== "list" ? (
            <div className="ct-nav">
              <button type="button" className="ct-arw is-prev" aria-label={t("prevWeek")} onClick={() => setOffset((o) => o - 1)}>
                <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                  <path d={PRODUCT_ICONS.chevR} />
                </svg>
              </button>
              <span className="ct-rg" aria-live="polite">
                {range}
              </span>
              <button type="button" className="ct-arw" aria-label={t("nextWeek")} onClick={() => setOffset((o) => o + 1)}>
                <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                  <path d={PRODUCT_ICONS.chevR} />
                </svg>
              </button>
              {offset !== 0 ? (
                <button type="button" className="ct-hoje" onClick={() => setOffset(0)}>
                  {t("today")}
                </button>
              ) : null}
            </div>
          ) : null}
          <span className="ps-grow" />
        </header>
        <div className="v4-empty v41-empty">
          <Agent agent="otto" size={48} expression="oval" />
          <b>{t("empty.title", { article: otto.article, agent: otto.name, business })}</b>
          <span>{t("empty.text")}</span>
          <span className="v4-empty-a">
            <Link className="hm-btn is-dark is-s" href={`/app/${shell.workspace.slug}/modo-autonomo`}>
              {t("empty.delegate")}
            </Link>
            <button type="button" className="hm-btn is-soft is-s" onClick={() => talk("kaia")}>
              {t("empty.askKaia")}
            </button>
          </span>
        </div>
      </section>
      <div className={`v41-low is-3 ct-low${tight ? " is-nar" : ""}`}>
        <section className="v41-cd v41-dl" aria-labelledby="ct-a-t">
          <header className="v41-cd-h">
            <h3 id="ct-a-t">{t("next.title")}</h3>
            <button type="button" className="v4-ask is-s" aria-label={t("next.talk")} data-tip={t("next.talkTip")} onClick={() => talk("otto")}>
              <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                <path d={PRODUCT_ICONS.ask} />
              </svg>
            </button>
          </header>
          <p className="v41-cd-e">{t("next.empty")}</p>
        </section>
        <section className="v41-cd" aria-labelledby="ct-b-t">
          <header className="v41-cd-h">
            <h3 id="ct-b-t">{t("perf.title")}</h3>
            <button type="button" className="v4-ask is-s" aria-label={t("perf.talk")} data-tip={t("perf.talkTip")} onClick={() => talk("iris")}>
              <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                <path d={PRODUCT_ICONS.ask} />
              </svg>
            </button>
          </header>
          <p className="v41-cd-e">{t("perf.empty")}</p>
        </section>
        <section className="v41-ai is-pill in6-box" aria-labelledby="ct-c-t">
          <i className="lv6-r" aria-hidden="true" />
          <header className="v41-cd-h">
            <Agent agent="otto" size={22} expression="oval" />
            <h3 id="ct-c-t" className="in6-k">
              {t("noticed.title")}
            </h3>
            <button type="button" className="v4-ask is-s" aria-label={t("noticed.talk")} data-tip={t("noticed.talkTip")} onClick={() => talk("otto")}>
              <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                <path d={PRODUCT_ICONS.ask} />
              </svg>
            </button>
          </header>
          <p className="v41-cd-e">{t("noticed.empty", { business })}</p>
        </section>
      </div>
    </div>
  );
}
