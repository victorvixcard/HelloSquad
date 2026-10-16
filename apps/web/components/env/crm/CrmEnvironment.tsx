"use client";

import { PRODUCT_ICONS } from "@hellosquad/ui";
import { useTranslations } from "next-intl";
import { useShell } from "@/components/product/shell-context";
import { EnvIdentity } from "../EnvIdentity";
import { NeedsStrip, type StripNeed } from "../NeedsStrip";

/** Pontos decorativos ao lado das fontes (V4.6 `mx-empty-v`, 24 círculos; o CSS acende alguns na cor do Max). */
const DOTS = Array.from({ length: 24 }, (_, i) => i);

/**
 * CRM · Max no primeiro acesso da V4.6 (`mx.none`, template L5453): a base de clientes ainda não está aqui e as
 * quatro fontes de onde ela pode vir, com o estado de cada uma. Nesta versão não há importação nem conexão de
 * canal, então "Importar", "Conectar" e "Saber mais" mostram o aviso padrão (na V4.6 abrem conversas roteirizadas).
 */
export function CrmEnvironment({ business, needs }: { business: string; needs: StripNeed[] }) {
  const t = useTranslations("envs.max");
  const tc = useTranslations("common");
  const shell = useShell();
  const nar = shell.layout.contentW < 1040 ? " is-nar" : "";
  const unavailable = () => shell.toast(tc("unavailable"), "max");
  const icon = (d: string) => (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d={d} />
    </svg>
  );
  return (
    <div className={`ps-v is-wide v4 mx${nar}`} style={{ maxWidth: shell.layout.contentW }}>
      <EnvIdentity agent="max" business={business} />
      <NeedsStrip items={needs} />
      <section className="mx-empty" aria-labelledby="mx-empty-t">
        <div className="mx-empty-b">
          <span className="ka-k">{t("kicker")}</span>
          <h2 id="mx-empty-t">{t("emptyTitle")}</h2>
          <p>{t("emptyText")}</p>
          <div className="mx-empty-l">
            <div className="mx-src is-off">
              {icon(PRODUCT_ICONS.sheet)}
              <span>
                <b>{t("sheet")}</b>
                <small>{t("sheetState")}</small>
              </span>
              <button type="button" className="hm-btn is-dark is-s" aria-label={t("sheetAria")} onClick={unavailable}>
                <span>{t("sheetAction")}</span>
              </button>
            </div>
            <div className="mx-src is-off">
              {icon(PRODUCT_ICONS.bag)}
              <span>
                <b>{t("store")}</b>
                <small>{t("storeState")}</small>
              </span>
            </div>
            <div className="mx-src is-off">
              {icon(PRODUCT_ICONS.mail)}
              <span>
                <b>{t("email")}</b>
                <small>{t("emailState")}</small>
              </span>
              <button type="button" className="hm-link is-s" aria-label={t("emailAria")} onClick={unavailable}>
                <span>{t("emailAction")}</span>
              </button>
            </div>
            <div className="mx-src is-off">
              {icon(PRODUCT_ICONS.wa)}
              <span>
                <b>{t("wa")}</b>
                <small>{t("waState")}</small>
              </span>
              <button type="button" className="hm-link is-s" aria-label={t("waAria")} onClick={unavailable}>
                <span>{t("waAction")}</span>
              </button>
            </div>
          </div>
        </div>
        <div className="mx-empty-v" aria-hidden="true">
          {DOTS.map((i) => (
            <i key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
