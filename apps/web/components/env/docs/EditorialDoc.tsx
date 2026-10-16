"use client";

import { getAgent, isAgentId } from "@hellosquad/ui";
import { useLocale, useTranslations } from "next-intl";
import "../content/content.css";
import { dayNum, shortDate, timeParts } from "../content/calendar";
import type { DocProps } from "./DocumentBody";
import { DocSection, list, obj, str } from "./doc-parts";

type Post = { data?: unknown; horario?: unknown; canal?: unknown; formato?: unknown; tema?: unknown; responsavel?: unknown; objetivo?: unknown; notas?: unknown };
type Beat = { trecho?: unknown; visual?: unknown };
type Version = { canal?: unknown; formato?: unknown; texto?: unknown; roteiro?: unknown; hashtags?: unknown; cta?: unknown };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function useLabels() {
  const t = useTranslations("editorial");
  const locale = useLocale();
  const label = (group: "channels" | "formats", id: string) => {
    const key = `${group}.${id}` as Parameters<typeof t>[0];
    return id && t.has(key) ? t(key) : id;
  };
  const date = (v: unknown) => (ISO.test(str(v)) ? shortDate(dayNum(str(v)), locale) : str(v));
  const time = (v: unknown) => {
    const tp = timeParts(str(v));
    return tp ? (tp.m === "00" ? t("timeH", { h: tp.h }) : t("timeHM", tp)) : "";
  };
  return { t, label, date, time };
}

/**
 * Leitor dos documentos do Otto (A2b, formato de `deliveries.py`): 04.02 (período e a pauta, um post por linha) e
 * 04.03 (tema, objetivo e uma versão por canal, com texto, roteiro em trechos, hashtags e chamada; o pedido para a
 * Kaia com o aviso de que a peça espera o motor de imagem; a estratégia seguida, quando o fluxo a acrescenta).
 */
export function EditorialDoc(props: DocProps) {
  return props.type === "04.03" ? <MultichannelDoc {...props} /> : <CalendarDoc {...props} />;
}

function CalendarDoc({ content }: DocProps) {
  const { t, label, date, time } = useLabels();
  const period = obj(content.periodo);
  const posts = list<Post>(content.posts);
  const from = date(period.inicio);
  const to = date(period.fim);
  return (
    <>
      <DocSection title={t("doc.period")} empty={!from && !to}>
        <p className="bd-p">{from && to ? t("doc.periodRange", { from, to }) : from || to}</p>
      </DocSection>
      <DocSection title={t("doc.posts")} empty={!posts.length}>
        <div className="ed-tw">
          <table className="ed-t">
            <thead>
              <tr>
                <th scope="col">{t("doc.cols.date")}</th>
                <th scope="col">{t("doc.cols.time")}</th>
                <th scope="col">{t("doc.cols.channel")}</th>
                <th scope="col">{t("doc.cols.format")}</th>
                <th scope="col">{t("doc.cols.theme")}</th>
                <th scope="col">{t("doc.cols.owner")}</th>
                <th scope="col">{t("doc.cols.goal")}</th>
                <th scope="col">{t("doc.cols.notes")}</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p, i) => {
                const owner = str(p.responsavel);
                return (
                  <tr key={i}>
                    <td className="ed-nw">{date(p.data)}</td>
                    <td className="ed-nw">{time(p.horario)}</td>
                    <td>{label("channels", str(p.canal))}</td>
                    <td>{label("formats", str(p.formato))}</td>
                    <th scope="row">{str(p.tema)}</th>
                    <td>{isAgentId(owner) ? getAgent(owner).name : owner}</td>
                    <td>{str(p.objetivo)}</td>
                    <td>{str(p.notas)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DocSection>
      <DocSection title={t("doc.notes")} empty={!str(content.notas)}>
        <p className="bd-p">{str(content.notas)}</p>
      </DocSection>
    </>
  );
}

function MultichannelDoc({ content }: DocProps) {
  const { t, label } = useLabels();
  const versions = list<Version>(content.versoes);
  const kaia = str(content.pedido_para_kaia);
  const strategy = obj(content.estrategia);
  const concept = str(strategy.conceito);
  const sv = str(strategy.versao);
  return (
    <>
      <DocSection title={t("doc.theme")} empty={!str(content.tema)}>
        <p className="bd-lead">{str(content.tema)}</p>
      </DocSection>
      <DocSection title={t("doc.goal")} empty={!str(content.objetivo)}>
        <p className="bd-p">{str(content.objetivo)}</p>
      </DocSection>
      <DocSection title={t("doc.strategy")} empty={!concept && !sv}>
        <p className="bd-p">{concept && sv ? t("doc.strategyText", { concept, version: sv }) : concept || t("doc.strategyPlain", { version: sv })}</p>
      </DocSection>
      <DocSection title={t("doc.versions")} empty={!versions.length}>
        <div className="ed-vs">
          {versions.map((v, i) => {
            const beats = list<Beat>(v.roteiro);
            const tags = list<unknown>(v.hashtags).map(str).filter(Boolean);
            const title = [label("channels", str(v.canal)), label("formats", str(v.formato))].filter(Boolean).join(" · ");
            return (
              <article key={i} className="bd-card ed-v" aria-label={title}>
                <h3 className="ed-vh">{title}</h3>
                {str(v.texto) ? (
                  <>
                    <span className="bd-k">{t("doc.text")}</span>
                    <p className="ed-tx">{str(v.texto)}</p>
                  </>
                ) : null}
                {beats.length ? (
                  <>
                    <span className="bd-k">{t("doc.script")}</span>
                    <ol className="ed-sc">
                      {beats.map((b, j) => (
                        <li key={j}>
                          <b>
                            {t("doc.beat")} {j + 1}
                          </b>
                          <span>{str(b.trecho)}</span>
                          {str(b.visual) ? (
                            <small>
                              {t("doc.visual")}: {str(b.visual)}
                            </small>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </>
                ) : null}
                {tags.length ? (
                  <>
                    <span className="bd-k">{t("doc.hashtags")}</span>
                    <p className="ed-hs">
                      {tags.map((h) => (
                        <span key={h} className="bd-tag">
                          {h}
                        </span>
                      ))}
                    </p>
                  </>
                ) : null}
                {str(v.cta) ? (
                  <>
                    <span className="bd-k">{t("doc.cta")}</span>
                    <p className="bd-p">{str(v.cta)}</p>
                  </>
                ) : null}
              </article>
            );
          })}
        </div>
      </DocSection>
      <DocSection title={t("doc.kaia")} empty={!kaia}>
        <p className="bd-p">{kaia}</p>
        <p className="bd-note">{t("doc.kaiaWait")}</p>
      </DocSection>
      <DocSection title={t("doc.notes")} empty={!str(content.notas)}>
        <p className="bd-p">{str(content.notas)}</p>
      </DocSection>
    </>
  );
}
