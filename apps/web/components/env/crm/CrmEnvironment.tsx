"use client";

import { PRODUCT_ICONS } from "@hellosquad/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { useShell } from "@/components/product/shell-context";
import { EnvIdentity } from "../EnvIdentity";
import type { WorkState } from "../growth/work-content";
import { NeedsStrip, type StripNeed } from "../NeedsStrip";
import type { ContactImport, ContactSummary, CrmCampaign, CrmSegments } from "./crm-types";
import { ImportPanel, ImportReport } from "./ImportPanel";
import "./crm.css";

/** Pontos decorativos ao lado das fontes (V4.6 `mx-empty-v`, 24 círculos; o CSS acende alguns na cor do Max). */
const DOTS = Array.from({ length: 24 }, (_, i) => i);

/** Ícone de cada estado (V4.6 `STI`, L12620). */
const STATE_ICON: Record<WorkState, string> = {
  draft: PRODUCT_ICONS.pen,
  you: PRODUCT_ICONS.alert,
  auth: PRODUCT_ICONS.alert,
  prog: PRODUCT_ICONS.clock,
  act: PRODUCT_ICONS.play,
  pause: PRODUCT_ICONS.pause,
  done: PRODUCT_ICONS.okc,
};
/** Legenda "Estados" na ordem da V4.6 (L12659). */
const LEGEND: readonly WorkState[] = ["draft", "you", "prog", "act", "pause", "done"];

type CrmProps = {
  business: string;
  needs: StripNeed[];
  /** Resumo da base (API); null quando ela não respondeu. */
  summary?: ContactSummary | null;
  /** Owner ou admin: a API só aceita a importação deles. */
  canImport?: boolean;
  segments?: CrmSegments | null;
  campaigns?: CrmCampaign[];
};

/**
 * CRM · Max (template L5453–5457). Sem contatos, o primeiro acesso da V4.6 (`mx.none`) com "Importar" funcionando.
 * Com contatos, a Central de relacionamento só com o que existe: os números da base e o consentimento (API), as fontes,
 * os segmentos do último 06.03 e as campanhas e sequências com o estado de cada uma. "Max percebeu" e a jornada da
 * reativação não aparecem: a API não tem esses dados ainda. Nada é enviado.
 */
export function CrmEnvironment({ business, needs, summary = null, canImport = false, segments = null, campaigns = [] }: CrmProps) {
  const t = useTranslations("envs.max");
  const tc = useTranslations("common");
  const tm = useTranslations("crm");
  const format = useFormatter();
  const shell = useShell();
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<ContactImport | null>(null);
  const nar = shell.layout.contentW < 1040 ? " is-nar" : "";
  const unavailable = () => shell.toast(tc("unavailable"), "max");
  const icon = (d: string) => (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d={d} />
    </svg>
  );
  const openImport = () => {
    setReport(null);
    setImporting(true);
  };
  const done = (r: ContactImport) => {
    setImporting(false);
    setReport(r);
    router.refresh();
  };
  const importBlock = (
    <>
      {importing ? <ImportPanel workspaceId={shell.workspace.id} onDone={done} onCancel={() => setImporting(false)} /> : null}
      {report ? <ImportReport report={report} /> : null}
    </>
  );
  const has = !!summary && summary.total > 0;

  if (!has) {
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
                {canImport ? (
                  <button type="button" className="hm-btn is-dark is-s" aria-label={t("sheetAria")} onClick={openImport}>
                    <span>{t("sheetAction")}</span>
                  </button>
                ) : null}
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
        {importBlock}
      </div>
    );
  }

  const s = summary!;
  const date = (iso: string) => format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric" });
  const pct = s.total ? Math.round((s.consented.any_channel * 100) / s.total) : 0;
  const kpis: Array<[number, string, string]> = [
    [s.total, tm("kpi.total"), tm("kpi.totalSub")],
    [s.consented.email, tm("kpi.email"), tm("kpi.emailSub")],
    [s.consented.whatsapp, tm("kpi.wa"), tm("kpi.waSub")],
    [s.without_consent, tm("kpi.none"), tm("kpi.noneSub")],
  ];

  return (
    <div className={`ps-v is-wide v4 mx${nar}`} style={{ maxWidth: shell.layout.contentW }}>
      <EnvIdentity agent="max" business={business} />
      <NeedsStrip items={needs} />
      <section className="mx-base" aria-label={tm("base")}>
        <div className="mx-kw">
          <div className="mx-k">
            {kpis.map(([v, l, sub]) => (
              <div className="mx-kp" key={l}>
                <b>{format.number(v)}</b>
                <span>{l}</span>
                <small>{sub}</small>
              </div>
            ))}
          </div>
          <div className="mx-kc">
            <span>{tm("consent", { n: s.consented.any_channel, total: s.total })}</span>
            <span className="mx-kc-b" aria-hidden="true">
              <i style={{ width: `${pct}%` }} />
            </span>
          </div>
          <p className="mx-rule">{tm("rule")}</p>
        </div>
        <div className="mx-srcs">
          <p className="mx-cons">
            <span className="mx-cons-k">{tm("sources")}</span>
          </p>
          <div className="mx-srcl">
            <div className="mx-src is-ok">
              {icon(PRODUCT_ICONS.sheet)}
              <span>
                <b>{t("sheet")}</b>
                <small>{s.last_import_at ? tm("sheetLast", { date: date(s.last_import_at) }) : tm("sheetNever")}</small>
              </span>
              {canImport ? (
                <button type="button" className="hm-link is-s" aria-label={t("sheetAria")} onClick={openImport}>
                  <span>{t("sheetAction")}</span>
                </button>
              ) : null}
            </div>
            {s.sources.map((x) => (
              <div className="mx-src is-ok" key={x.source}>
                {icon(PRODUCT_ICONS.user)}
                <span>
                  <b>{x.source}</b>
                  <small>{tm("sourceContacts", { n: x.contacts })}</small>
                </span>
              </div>
            ))}
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
      </section>
      {importBlock}
      <Segments data={segments} />
      <Campaigns items={campaigns} />
    </div>
  );
}

/** "Segmentos" com o painel "Público selecionado" (template L5456), a partir do último 06.03. */
function Segments({ data }: { data: CrmSegments | null }) {
  const tm = useTranslations("crm");
  const format = useFormatter();
  const shell = useShell();
  const segs = data?.segments ?? [];
  const [pick, setPick] = useState<string | null>(null);
  const G = segs.find((g) => g.id === pick) ?? segs[0] ?? null;
  const n = (v: number | null) => (v === null ? "—" : format.number(v));
  const talk = (draft?: string) =>
    G &&
    shell.openConversation({
      conversationId: null,
      agent: "max",
      context: {
        kind: "segment",
        label: G.name,
        origin: tm("seg.context"),
        ref: { type: "segment", key: G.id, title: G.name, ...(G.size !== null ? { summary: tm("doc.segSize", { n: G.size }) } : {}) },
      },
      ...(draft ? { draft } : {}),
    });
  return (
    <section className="mx-seg" aria-labelledby="mx-seg-t">
      <header className="bi-sh">
        <h2 id="mx-seg-t">{tm("seg.title")}</h2>
        <small>{tm("seg.sub")}</small>
      </header>
      {!G || !data ? (
        <p className="v41-cd-e">{tm("seg.empty")}</p>
      ) : (
        <div className="mx-seg-g">
          <div className="mx-sgl" role="radiogroup" aria-label={tm("seg.title")}>
            {segs.map((g) => (
              <button
                key={g.id}
                type="button"
                role="radio"
                className={`mx-sg${g.id === G.id ? " is-on" : ""}`}
                aria-checked={g.id === G.id}
                aria-label={tm("seg.aria", { name: g.name, n: n(g.size), email: n(g.email), wa: n(g.wa) })}
                onClick={() => setPick(g.id)}
              >
                <span className="mx-sg-t">{g.name}</span>
                <b>{n(g.size)}</b>
              </button>
            ))}
          </div>
          <div className="mx-sgd">
            <div className="mx-sgd-h">
              <div>
                <span className="ka-k">{tm("seg.picked")}</span>
                <h3>{G.name}</h3>
                <p>{G.description}</p>
              </div>
              <b className="mx-big">
                {n(G.size)}
                <small>{tm("seg.contacts")}</small>
              </b>
            </div>
            <dl className="mx-f">
              <div>
                <dt>{tm("seg.origin")}</dt>
                <dd>
                  <Link href={`/app/${shell.workspace.slug}/squad/max/trabalho/${data.workItemId}`}>
                    {tm("seg.from", { title: data.title, no: data.versionNo })}
                  </Link>
                  {data.origins.length ? <> · {data.origins.join(", ")}</> : null}
                </dd>
              </div>
              <div>
                <dt>{tm("seg.receive")}</dt>
                <dd>{tm("seg.receiveV", { email: n(G.email), wa: n(G.wa) })}</dd>
              </div>
              <div>
                <dt>{tm("seg.channel")}</dt>
                <dd>
                  <span className="mx-ch is-off">{tm("seg.noChannel")}</span>
                </dd>
              </div>
              <div>
                <dt>{tm("seg.action")}</dt>
                <dd>{G.use}</dd>
              </div>
            </dl>
            <div className="mx-sga">
              <button type="button" className="hm-btn is-dark is-s" onClick={() => talk(tm("seg.ask", { name: G.name }))}>
                <span>{tm("seg.start")}</span>
              </button>
              <button type="button" className="hm-link" onClick={() => talk()}>
                <span>{tm("seg.talk")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/** "Campanhas e jornadas" (template L5457): os trabalhos 06.01 e 06.02 com o estado e o link para o documento. */
function Campaigns({ items }: { items: CrmCampaign[] }) {
  const tm = useTranslations("crm");
  const chip = (k: WorkState) => (
    <span key={k} className={`mx-st is-${k === "auth" ? "you" : k}`}>
      <svg viewBox="0 0 18 18" aria-hidden="true">
        <path d={STATE_ICON[k]} />
      </svg>
      <span>{tm(`camps.state.${k}`)}</span>
    </span>
  );
  return (
    <section className="mx-camps" aria-labelledby="mx-cp-t">
      <header className="bi-sh">
        <h2 id="mx-cp-t">{tm("camps.title")}</h2>
        <small>{tm("camps.sub")}</small>
      </header>
      {items.length ? (
        <div className="mx-cpl">
          {items.map((c) => (
            <Link key={c.id} className="mx-cp" href={c.href}>
              {chip(c.state)}
              <b>{c.title}</b>
              {c.goal ? <small>{c.goal}</small> : null}
              <span className="mx-cp-m">
                {c.segment ? <span>{c.segment}</span> : null}
                {c.channels.length ? <span>{c.channels.map((ch) => tm(`channel.${ch === "whatsapp" ? "whatsapp" : "email"}`)).join(", ")}</span> : null}
                {c.steps !== null ? <span>{tm("camps.steps", { n: c.steps })}</span> : null}
              </span>
              {c.next ? <span className="mx-cp-nx">{tm("camps.next", { step: c.next })}</span> : null}
            </Link>
          ))}
        </div>
      ) : (
        <p className="v41-cd-e">{tm("camps.empty")}</p>
      )}
      <div className="mx-legend" aria-label={tm("camps.legend")}>
        <span className="mx-legend-k">{tm("camps.legendK")}</span>
        {LEGEND.map((k) => chip(k))}
      </div>
    </section>
  );
}
