"use client";

import { Agent, Icon, PRODUCT_ICONS } from "@hellosquad/ui";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { StatusGlyph } from "@/components/env/projects/StatusGlyph";
import { useShell } from "@/components/product/shell-context";
import { TIME_ZONE } from "@/i18n/config";
import { CAPABILITIES } from "@/lib/capabilities";
import { deliveryTypeKey } from "@/lib/delivery-types";
import { useOpenCapability } from "../CapCatalog";
import { EnvIdentity } from "../EnvIdentity";
import { NeedsStrip, type StripNeed } from "../NeedsStrip";
import { EMPTY_STRATEGY, type StrategyData, type StrategyDocItem } from "./strategy-data";
import "./strategy.css";

const REL = { alta: 3, media: 2, baixa: 1 } as const;
const VISIBLE_OPS = 3;

/**
 * Estratégia · Bia (V4.6, `_vBia` L12528 e a camada V4.6 L13885). Sem nenhum trabalho da Bia, o primeiro acesso
 * (`bia.first`, template L5434): só o convite ao diagnóstico. Com trabalhos, só o que a API tem: "Direção estratégica"
 * com um posicionamento (02.02) aprovado; "Oportunidades identificadas" do diagnóstico (02.01) mais recente; "Em
 * análise" com os trabalhos ainda sem versão; "Planos e diagnósticos" com cada documento que já tem versão.
 */
export function StrategyEnvironment({
  business,
  needs,
  data = EMPTY_STRATEGY,
}: {
  business: string;
  needs: StripNeed[];
  data?: StrategyData;
}) {
  const t = useTranslations("envs.bia");
  const ts = useTranslations("strategy.env");
  const tc = useTranslations("common");
  const locale = useLocale();
  const shell = useShell();
  const [more, setMore] = useState(false);
  const nar = shell.layout.contentW < 1040 ? " is-nar" : "";
  const base = `/app/${shell.workspace.slug}/squad/bia`;
  const docHref = (id: string) => `${base}/trabalho/${id}`;
  const day = (iso: string) => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", timeZone: TIME_ZONE }).format(new Date(iso));
  const month = (iso: string) => new Intl.DateTimeFormat(locale, { month: "long", timeZone: TIME_ZONE }).format(new Date(iso));
  // "Analisar meu negócio" é a capacidade `b-diag` (V4.6 L12564): abre a conversa do pedido com o texto no campo;
  // enviar cria o trabalho do diagnóstico (02.01).
  const openCap = useOpenCapability();
  const diag = CAPABILITIES.bia.find((c) => c.id === "b-diag");
  const start = () => diag && openCap("bia", diag);
  // Conversa do documento (o painel cria a conversa do objeto na API, uma por documento e reaproveitada).
  const talkDoc = (workItemId: string, title: string) =>
    shell.openConversation({
      conversationId: null,
      agent: "bia",
      context: { kind: "document", label: title, href: docHref(workItemId), ref: { type: "document", key: workItemId, title: title.slice(0, 200) } },
    });

  if (!data.hasWork) {
    return (
      <div className={`ps-v is-wide v4 bi${nar}`} style={{ maxWidth: shell.layout.contentW }}>
        <EnvIdentity agent="bia" business={business} />
        <NeedsStrip items={needs} />
        <section className="bi-empty" aria-labelledby="bi-empty-t">
          <span className="ka-k">{t("kicker")}</span>
          <h2 id="bi-empty-t">{t("firstTitle", { business })}</h2>
          <p>{t("firstText")}</p>
          <button type="button" className="hm-btn is-dark is-s" onClick={start}>
            <span>{t("start")}</span>
          </button>
        </section>
      </div>
    );
  }

  const dir = data.direction;
  const src = data.opportunitySource;
  // Conversa de cada oportunidade: objeto `opportunity` com a chave do diagnóstico e o número (uma por oportunidade).
  const talkOpp = (n: number, title: string, summary: string) =>
    src &&
    shell.openConversation({
      conversationId: null,
      agent: "bia",
      context: {
        kind: "opportunity",
        label: title,
        href: docHref(src.workItemId),
        meta: src.title,
        ref: { type: "opportunity", key: `${src.workItemId}:o${n}`, title: title.slice(0, 200), summary: summary.slice(0, 500) },
      },
    });
  const ops = data.opportunities.map((x, i) => ({ ...x, n: String(i + 1).padStart(2, "0") }));
  const opItem = (x: (typeof ops)[number], i: number) => {
    const lead = i === 0;
    const rel = x.prioridade ?? "baixa";
    return (
      <li key={x.n} className={`bi-o${lead ? " is-lead lv6" : ""}`}>
        {lead ? <i className="lv6-r" aria-hidden="true" /> : null}
        <span className="bi-o-n">{x.n}</span>
        <div className="bi-o-b">
          {lead ? <span className="in6-k is-arch">{ts("lead")}</span> : null}
          <div className="bi-o-h">
            <b>{x.titulo}</b>
            {x.prioridade ? <span className={`bi-rel is-${REL[rel]}`}>{ts(`rel.${rel}`)}</span> : null}
          </div>
          {x.descricao ? <p>{x.descricao}</p> : null}
          {lead && src ? (
            <p className="in6-src">
              <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                <path d={PRODUCT_ICONS.file} />
              </svg>
              <span>{ts("leadSrc", { title: src.title, version: src.version, date: day(src.at) })}</span>
            </p>
          ) : null}
          <div className="bi-o-f">
            <button type="button" className="hm-link" aria-label={ts("talkAria", { title: x.titulo })} onClick={() => talkOpp(i + 1, x.titulo, x.descricao)}>
              <span>{ts("talk")}</span>
              <Icon name="arrow" size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </li>
    );
  };
  const docItem = (d: StrategyDocItem) => {
    const key = deliveryTypeKey(d.type);
    const kind = key ? tc(`deliveryTypes.${key}`) : "";
    const state = ts(`docState.${d.family}`);
    const cover = d.type === "02.04" && d.quote ? "camp" : d.type === "02.03" ? "plan" : d.type === "02.01" ? "dx" : "doc";
    return (
      <Link
        key={d.workItemId}
        href={docHref(d.workItemId)}
        className={`bi-doc is-${cover}${d.family === "you" ? " is-you" : ""}`}
        aria-label={ts("docAria", { kind, title: d.title, state })}
      >
        <span className="bi-cover" aria-hidden="true">
          <span className="bi-cv-k">{kind}</span>
          <span className="bi-cv-t">{d.title}</span>
          {cover === "dx" ? (
            <span className="bi-cv-dx">
              <i />
              <i />
              <i />
            </span>
          ) : null}
          {cover === "plan" ? (
            <span className="bi-cv-hz">
              <i />
              <i />
              <i />
            </span>
          ) : null}
          {cover === "camp" ? <span className="bi-cv-q">{`“${d.quote}”`}</span> : null}
          <span className="bi-cv-l" />
          {cover !== "camp" ? <span className="bi-cv-l is-m" /> : null}
          <span className="bi-cv-l is-s" />
        </span>
        <span className="bi-doc-c">
          <span className={`v41-tag is-${d.family}`}>
            <StatusGlyph family={d.family} />
            <span>{state}</span>
          </span>
          <small>{ts("docMeta", { month: month(d.at), version: d.version })}</small>
        </span>
      </Link>
    );
  };

  return (
    <div className={`ps-v is-wide v4 bi${nar}`} style={{ maxWidth: shell.layout.contentW }}>
      <EnvIdentity agent="bia" business={business} />
      <NeedsStrip items={needs} />
      {dir ? (
        <section className="bi-dir" aria-labelledby="bi-dir-t">
          <div className="bi-dir-q">
            <span className="ka-k" id="bi-dir-t">
              {t("kicker")}
            </span>
            <blockquote>{`“${dir.posicionamento}”`}</blockquote>
            <div className="bi-dir-f">
              {dir.approvedAt ? <small>{ts("dirPosK", { date: day(dir.approvedAt) })}</small> : null}
              <button type="button" className="hm-link" onClick={() => talkDoc(dir.workItemId, dir.title)}>
                <span>{ts("refine")}</span>
                <Icon name="arrow" size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
          <dl className="bi-dir-l">
            {dir.objetivo ? (
              <div>
                <dt>{ts("rows.objective")}</dt>
                <dd>{dir.objetivo.prazo ? ts("joined", { a: dir.objetivo.objetivo, b: dir.objetivo.prazo }) : dir.objetivo.objetivo}</dd>
              </div>
            ) : null}
            {dir.prioridade ? (
              <div>
                <dt>{ts("rows.priority")}</dt>
                <dd>{dir.prioridade.horizonte ? ts("joined", { a: dir.prioridade.acao, b: dir.prioridade.horizonte }) : dir.prioridade.acao}</dd>
              </div>
            ) : null}
            {dir.publico ? (
              <div>
                <dt>{ts("rows.audience")}</dt>
                <dd>{dir.publico}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}
      <div className="bi-g">
        <section className="bi-ops" aria-labelledby="bi-ops-t">
          <header className="bi-sh">
            <h2 id="bi-ops-t">{ts("ops")}</h2>
            <small>{ts("opsSub")}</small>
          </header>
          {ops.length ? (
            <>
              <ol className="bi-ol">{ops.slice(0, VISIBLE_OPS).map(opItem)}</ol>
              {ops.length > VISIBLE_OPS ? (
                <>
                  <div className={`v41-more${more ? " is-open" : ""}`} id="bi-ops-more">
                    <div className="v41-more-in">
                      <ol className="bi-ol is-rest">{ops.slice(VISIBLE_OPS).map((x, i) => opItem(x, i + VISIBLE_OPS))}</ol>
                    </div>
                  </div>
                  <button type="button" className="v41-xbtn" aria-expanded={more} aria-controls="bi-ops-more" onClick={() => setMore((v) => !v)}>
                    <span>{more ? ts("less") : ts("more", { count: ops.length - VISIBLE_OPS })}</span>
                    <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                      <path d={PRODUCT_ICONS.chev} />
                    </svg>
                  </button>
                </>
              ) : null}
            </>
          ) : (
            <p className="bi-none">{ts("opsEmpty")}</p>
          )}
        </section>
        <section className="bi-ana" aria-labelledby="bi-ana-t">
          <header className="bi-sh">
            <h2 id="bi-ana-t">{ts("ana")}</h2>
            <small>{ts("anaSub")}</small>
          </header>
          {data.analyses.length ? (
            data.analyses.map((a, i) => {
              const key = deliveryTypeKey(a.type);
              return (
                <Link key={a.workItemId} href={docHref(a.workItemId)} className={`bi-a${i === 0 ? " is-live" : ""}`}>
                  <span className="bi-a-av" aria-hidden="true">
                    <Agent agent="bia" size={26} expression="oval" thinking={i === 0} />
                  </span>
                  <span className="bi-a-m">
                    <span className="bi-a-k">
                      <span className={`v41-tag is-${a.family}`}>
                        <StatusGlyph family={a.family} />
                        <span>{a.family === "pause" ? tc("states.paused") : tc("states.in_progress")}</span>
                      </span>
                      {a.dueAt ? <small>{ts("anaDue", { date: day(a.dueAt) })}</small> : null}
                    </span>
                    <b>{a.title}</b>
                    {a.statusLabel || key ? <small className="bi-a-s">{a.statusLabel || (key ? tc(`deliveryTypes.${key}`) : "")}</small> : null}
                  </span>
                </Link>
              );
            })
          ) : (
            <p className="bi-none">{ts("anaEmpty")}</p>
          )}
        </section>
      </div>
      <section className="bi-docs" aria-labelledby="bi-docs-t">
        <header className="bi-sh">
          <h2 id="bi-docs-t">{ts("docs")}</h2>
          <small>{ts("docsSub")}</small>
        </header>
        {data.docs.length ? <div className="bi-shelf">{data.docs.map(docItem)}</div> : <p className="bi-none">{ts("docsEmpty")}</p>}
      </section>
    </div>
  );
}
