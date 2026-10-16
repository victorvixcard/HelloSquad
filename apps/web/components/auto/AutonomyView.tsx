"use client";

import { Agent, PRODUCT_ICONS, type AgentId } from "@hellosquad/ui";
import { useTranslations } from "next-intl";
import { useShell } from "@/components/product/shell-context";

/** Modelos de "O que mais pode ficar com o squad" (V4.5 `_d5Templates`, L13141; `TPL`, L6078): quem faz cada um. */
export const AUTONOMY_TEMPLATES = [
  { id: "plan", agents: ["otto", "kaia"] },
  { id: "posts", agents: ["kaia", "otto"] },
  { id: "opp", agents: ["bia", "iris"] },
  { id: "reviews", agents: ["max"] },
] as const satisfies ReadonlyArray<{ id: string; agents: readonly AgentId[] }>;

/** Os três níveis da página (`LV5B`, L13461): o "Nunca" só existe no detalhe de uma responsabilidade. */
const LEVELS = ["an", "pr", "ex"] as const;

/**
 * Modo Autônomo como a V4.6 o mostra sem nenhuma responsabilidade (primeiro acesso, template L5097–5187):
 * cabeçalho sem interruptor (só existe com responsabilidade ativa ou pausada), sem resumo (só com
 * responsabilidades), o vazio, os modelos, os três níveis e as duas colunas com o vazio de cada uma.
 * Rotinas são da Fase 3: delegar ainda não existe, e os botões avisam isso (padrão da A1f).
 */
export function AutonomyView({ business }: { business: string }) {
  const t = useTranslations("auto");
  const tc = useTranslations("common");
  const shell = useShell();
  const W = shell.layout.contentW;
  const unavailable = () => shell.toast(tc("unavailable"), "nexo");

  return (
    <div className={"ps-v is-wide v4 au" + (W < 1040 ? " is-nar" : "") + (W < 820 ? " is-tight" : "")} style={{ maxWidth: W }}>
      <header className="v4-id au-id">
        <span className="v4-id-av au-ico" aria-hidden="true">
          <svg className="sb-ic" viewBox="0 0 18 18">
            <path d={PRODUCT_ICONS.auto} />
          </svg>
        </span>
        <div className="v4-id-t">
          <h1 className="v4-h1">{t("title")}</h1>
          <p className="v4-id-d">{t("sub")}</p>
        </div>
        <button type="button" className="hm-btn is-dark is-s au-go" onClick={unavailable}>
          <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
            <path d={PRODUCT_ICONS.plus} />
          </svg>
          <span>{t("delegate")}</span>
        </button>
      </header>
      <div className="au-g">
        <div className="au-main">
          <section className="au-rs" aria-labelledby="au-rs-t">
            <header className="bi-sh">
              <h2 id="au-rs-t">{t("resps.title")}</h2>
              <small>{t("resps.sub")}</small>
            </header>
            <div className="au-empty">
              <b>{t("empty.title")}</b>
              <p>{t("empty.text")}</p>
              <button type="button" className="hm-btn is-dark is-s" onClick={unavailable}>
                <span>{t("empty.cta")}</span>
              </button>
            </div>
          </section>
          <section className="au-more" aria-labelledby="au-more-t">
            <header className="bi-sh">
              <h2 id="au-more-t">{t("more.title")}</h2>
              <small>{t("more.sub")}</small>
            </header>
            <div className="au-tl">
              {AUTONOMY_TEMPLATES.map((tpl) => {
                const title = t(`templates.${tpl.id}.title`);
                return (
                  <button key={tpl.id} type="button" className="au-t" aria-label={t("more.aria", { title })} onClick={unavailable}>
                    <span className="kw-ags" aria-hidden="true">
                      {tpl.agents.map((a) => (
                        <Agent key={a} agent={a} size={22} />
                      ))}
                    </span>
                    <span className="au-t-t">
                      <b>{title}</b>
                      <small>{t(`templates.${tpl.id}.text`, { business })}</small>
                    </span>
                    <svg className="sb-ic au-t-a" viewBox="0 0 18 18" aria-hidden="true">
                      <path d={PRODUCT_ICONS.arrowR} />
                    </svg>
                  </button>
                );
              })}
            </div>
          </section>
          <section className="au-lv" aria-labelledby="au-lv-t">
            <header className="bi-sh">
              <h2 id="au-lv-t">{t("levels.title")}</h2>
              <small>{t("levels.sub")}</small>
            </header>
            <ol className="au-lvl">
              {LEVELS.map((l) => (
                <li key={l} className={`au-lv-i is-${l}`}>
                  <span className="au-lv-k">{t(`levels.${l}.k`)}</span>
                  <p>{t(`levels.${l}.d`)}</p>
                  <b>{t(`levels.${l}.w`)}</b>
                </li>
              ))}
            </ol>
            <p className="au-lv-f">
              <svg className="ps-ic" viewBox="0 0 18 18" aria-hidden="true">
                <path d={PRODUCT_ICONS.shield} />
              </svg>
              <span>{t("levels.foot")}</span>
            </p>
          </section>
        </div>
        <aside className="au-side">
          <section className="au-up" aria-labelledby="au-up-t">
            <header className="bi-sh">
              <h2 id="au-up-t">{t("next.title")}</h2>
            </header>
            <p className="au-none">{t("next.empty")}</p>
          </section>
          <section className="au-hi" aria-labelledby="au-hi-t">
            <header className="bi-sh">
              <h2 id="au-hi-t">{t("history.title")}</h2>
            </header>
            <p className="au-none">{t("history.empty")}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
