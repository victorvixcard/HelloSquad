"use client";

import { getAgent, isAgentId } from "@hellosquad/ui";
import { useFormatter, useTranslations } from "next-intl";
import type { DocProps } from "./DocumentBody";
import { DocSection, list, obj, str } from "./doc-parts";
import "../results/results.css";

type Reading = { texto?: unknown; tipo?: unknown; evidencias?: unknown; canal?: unknown };

/** Chave do catálogo montada com o id gravado pelo worker (canal, métrica, origem): conferida com `has` antes. */
const k = (key: string) => key as never;

/**
 * Documentos da Íris (07.02 análise de desempenho, 07.03 relatório do período, 07.04 recomendações), na ordem do formato
 * que o worker grava (`squad/deliveries.py` e `iris_content` em `squad/flow.py`). Cada leitura mostra o tipo como o
 * worker gravou (fato, hipótese): a Íris nunca afirma causa sem evidência, e a tela não troca o tipo.
 */
export function ResultsDoc({ type, content }: DocProps) {
  const t = useTranslations("results");
  const format = useFormatter();
  const dados = obj(content.dados);
  const evid = list<Record<string, unknown>>(content.evidencias);

  const day = (iso: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(iso) ? format.dateTime(new Date(`${iso}T12:00:00Z`), { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }) : iso;
  const range = (r: Record<string, unknown>) => (str(r.inicio) && str(r.fim) ? t("range", { from: day(str(r.inicio)), to: day(str(r.fim)) }) : "");
  const seriesName = (canal: string, metrica: string) =>
    t.has(k(`series.${canal}.${metrica}`)) ? t(k(`series.${canal}.${metrica}`)) : [canal, metrica].filter(Boolean).join(" · ");
  const channelName = (canal: string) => (t.has(k(`channels.${canal}`)) ? t(k(`channels.${canal}`)) : canal);
  const sources = (v: unknown) =>
    list<string>(v)
      .map((s) => (t.has(k(`sourceNames.${s}`)) ? t(k(`sourceNames.${s}`)) : s))
      .join(", ");
  const num = (v: unknown) => (typeof v === "number" ? format.number(v, { maximumFractionDigits: 1 }) : str(v));
  const agent = (id: unknown) => (typeof id === "string" && isAgentId(id) ? getAgent(id).name : str(id));

  const kind = (v: unknown) => {
    const kd = str(v);
    return t.has(k(`doc.kinds.${kd}`)) ? t(k(`doc.kinds.${kd}`)) : kd;
  };
  const cites = (v: unknown) => {
    const ids = list<string>(v).filter((x) => typeof x === "string");
    return ids.length ? t("doc.cites", { ids: ids.join(", ") }) : t("doc.noCites");
  };
  const readings = (items: Reading[], withChannel = false) => (
    <ul className="bd-ul rs-reads">
      {items.map((r, i) => (
        <li key={i} className={`is-${str(r.tipo) || "x"}`}>
          {withChannel && str(r.canal) ? <b>{channelName(str(r.canal))}</b> : null}
          <span>{str(r.texto)}</span>
          <span className="rs-read-meta">
            <span className={`bd-tag rs-kind is-${str(r.tipo)}`}>{kind(r.tipo)}</span>
            <small>{cites(r.evidencias)}</small>
          </span>
        </li>
      ))}
    </ul>
  );
  const texts = (v: unknown) => list<unknown>(v).map(str).filter(Boolean);
  const plain = (items: string[]) => (
    <ul className="bd-ul">
      {items.map((x, i) => (
        <li key={i}>
          <span>{x}</span>
        </li>
      ))}
    </ul>
  );

  const current = obj(dados.periodo_atual);
  const previous = obj(dados.periodo_anterior);
  const gaps = list<Record<string, unknown>>(dados.lacunas);
  const leituras = list<Reading>(content.leituras);
  const destaques = list<Reading>(content.destaques);
  const porCanal = list<Reading>(content.por_canal);
  const recs = list<Record<string, unknown>>(content.recomendacoes).sort((a, b) => Number(a.ordem ?? 0) - Number(b.ordem ?? 0));
  const notShown = texts(content.o_que_os_dados_nao_mostram);
  const missing = list<Record<string, unknown>>(content.dados_que_faltam);
  const limits = texts(content.limitacoes);
  const next = texts(content.proximos_passos);
  const questions = texts(content.perguntas_para_o_squad);
  const premises = texts(content.premissas);
  const analyses = list<Record<string, unknown>>(content.analises);
  const prevReport = content.relatorio_anterior === undefined ? undefined : obj(content.relatorio_anterior);

  const evidenceTable = (
    <table className="ps-table rs-evid">
      <thead>
        <tr>
          <th scope="col">{t("doc.cols.id")}</th>
          <th scope="col">{t("doc.cols.series")}</th>
          <th scope="col">{t("doc.cols.current")}</th>
          <th scope="col">{t("doc.cols.previous")}</th>
          <th scope="col">{t("doc.cols.variation")}</th>
          <th scope="col">{t("doc.cols.days")}</th>
          <th scope="col">{t("doc.cols.origin")}</th>
        </tr>
      </thead>
      <tbody>
        {evid.map((e) => {
          const dd = obj(e.dias_com_dado);
          const agg = str(e.agregacao);
          const base = str(e.base_da_variacao);
          const v = e.variacao_pct;
          return (
            <tr key={str(e.id)}>
              <th scope="row">{str(e.id)}</th>
              <td>
                <b>{seriesName(str(e.canal), str(e.metrica))}</b>
                <small>{t.has(k(`doc.aggregation.${agg}`)) ? t(k(`doc.aggregation.${agg}`)) : agg}</small>
              </td>
              <td>{num(e.atual)}</td>
              <td>{num(e.anterior)}</td>
              <td>
                {typeof v === "number" ? format.number(v / 100, { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }) : t("doc.noVariation")}
                {typeof v === "number" && t.has(k(`doc.base.${base}`)) ? <small>{t(k(`doc.base.${base}`))}</small> : null}
              </td>
              <td>{t("doc.daysCell", { now: num(dd.atual), before: num(dd.anterior), total: num(e.dias_no_periodo) })}</td>
              <td>{sources(e.origem)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <>
      {str(content.resumo) ? (
        <DocSection title="">
          <p className="bd-lead">{str(content.resumo)}</p>
        </DocSection>
      ) : null}

      <DocSection title={t("doc.period")} empty={!Object.keys(dados).length}>
        <dl className="rs-dl">
          {range(current) ? (
            <div>
              <dt>{t("doc.current")}</dt>
              <dd>{range(current)}</dd>
            </div>
          ) : null}
          {range(previous) ? (
            <div>
              <dt>{t("doc.previous")}</dt>
              <dd>{range(previous)}</dd>
            </div>
          ) : null}
          {str(dados.atualizado_ate) ? (
            <div>
              <dt>{t("doc.updated")}</dt>
              <dd>{day(str(dados.atualizado_ate))}</dd>
            </div>
          ) : null}
          {sources(dados.fontes) ? (
            <div>
              <dt>{t("doc.origin")}</dt>
              <dd>{sources(dados.fontes)}</dd>
            </div>
          ) : null}
          <div>
            <dt>{t("doc.gaps")}</dt>
            <dd>
              {gaps.length
                ? gaps.map((g) => t("doc.gapItem", { series: seriesName(str(g.canal), str(g.metrica)), from: day(str(g.de)), to: day(str(g.ate)) })).join("; ")
                : t("doc.noGaps")}
            </dd>
          </div>
        </dl>
      </DocSection>

      <DocSection title={t("doc.readings")} empty={!leituras.length}>
        {readings(leituras)}
      </DocSection>
      <DocSection title={t("doc.highlights")} empty={!destaques.length}>
        {readings(destaques)}
      </DocSection>

      <DocSection title={type === "07.03" ? t("doc.comparison") : t("doc.evidence")} empty={!evid.length}>
        {evidenceTable}
      </DocSection>

      <DocSection title={t("doc.byChannel")} empty={!porCanal.length}>
        {readings(porCanal, true)}
      </DocSection>

      <DocSection title={t("doc.recommendations")} empty={!recs.length}>
        <div className="bd-recs">
          {recs.map((r, i) => {
            const base = str(r.base);
            const effort = str(r.esforco);
            const discuss = list<unknown>(r.discutir_com).map(agent).filter(Boolean);
            return (
              <article key={i} className="bd-rec">
                <span className="bd-rec-n">{str(r.ordem) || i + 1}</span>
                <div className="bd-rec-b">
                  <b>{str(r.acao)}</b>
                  <p>{str(r.por_que)}</p>
                  <div className="bd-rec-who">
                    <span className={`bd-tag rs-kind is-${base}`}>{t.has(k(`doc.bases.${base}`)) ? t(k(`doc.bases.${base}`)) : base}</span>
                    <span>{cites(r.evidencias)}</span>
                    {str(r.responsavel) ? <span>{t("doc.owner", { agent: agent(r.responsavel) })}</span> : null}
                    {effort ? <span>{t.has(k(`doc.effort.${effort}`)) ? t(k(`doc.effort.${effort}`)) : effort}</span> : null}
                    {discuss.length ? <span>{t("doc.discuss", { agents: discuss.join(", ") })}</span> : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </DocSection>

      <DocSection title={t("doc.notShown")} empty={!notShown.length}>
        {plain(notShown)}
      </DocSection>
      <DocSection title={t("doc.missing")} empty={!missing.length}>
        <ul className="bd-ul is-warn">
          {missing.map((m, i) => (
            <li key={i}>
              <b>{str(m.dado)}</b>
              {str(m.como_conseguir) ? <span>{t("doc.howToGet", { how: str(m.como_conseguir) })}</span> : null}
            </li>
          ))}
        </ul>
      </DocSection>
      <DocSection title={t("doc.limitations")} empty={!limits.length}>
        <ul className="bd-ul is-warn">
          {limits.map((x, i) => (
            <li key={i}>
              <span>{x}</span>
            </li>
          ))}
        </ul>
      </DocSection>
      <DocSection title={t("doc.questions")} empty={!questions.length}>
        {plain(questions)}
      </DocSection>
      <DocSection title={t("doc.assumptions")} empty={!premises.length}>
        {plain(premises)}
      </DocSection>
      <DocSection title={t("doc.next")} empty={!next.length}>
        {plain(next)}
      </DocSection>
      <DocSection title={t("doc.previousReport")} empty={type !== "07.03" || prevReport === undefined}>
        <p className="bd-note">{prevReport && str(prevReport.versao) ? t("doc.previousReportV", { version: str(prevReport.versao) }) : t("doc.noPreviousReport")}</p>
      </DocSection>
      <DocSection title={t("doc.analysesUsed")} empty={!analyses.length}>
        {plain(analyses.map((a) => t("doc.analysisRef", { version: str(a.versao) })))}
      </DocSection>
    </>
  );
}
