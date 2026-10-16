"use client";

import { Agent, Button, PRODUCT_ICONS } from "@hellosquad/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, type MouseEvent, useState } from "react";
import { type ConversationContextRef, useShell } from "@/components/product/shell-context";
import { EnvIdentity, useEnvConversation } from "../EnvIdentity";
import { NeedsStrip, type StripNeed } from "../NeedsStrip";
import { k, useLabels } from "./labels";
import {
  KPI_KEYS,
  lastDataDay,
  type MetricSeries,
  niceScale,
  type PeriodId,
  PERIOD_DAYS,
  PERIODS,
  periodRanges,
  seriesKey,
  summarize,
  type Summary,
  weekly,
  type Week,
} from "./metrics";
import "./results.css";

const KPIS = ["orders", "visits", "reach"] as const;
const SERIES_ORDER = ["site.sessions", "instagram.followers", "instagram.reach", "store.orders"];

/** Um trabalho 07.02, 07.03 ou 07.04 da Íris ("Análises recentes"). */
export type IrisAnalysis = {
  id: string;
  title: string;
  type: "07.02" | "07.03" | "07.04";
  version: number | null;
  status: string;
  href: string;
};

/**
 * Resultados · Íris (V4.6 `_vRs`, template L5296). Sem série com dado, o primeiro acesso (`rs.empty`): a tela diz o que
 * falta e leva às conexões. Com dado, só o que a API tem: período, indicadores, gráfico de 12 semanas, canais e as
 * análises da Íris. "Íris percebeu" e "Oportunidades" não aparecem: a API ainda não tem essas leituras.
 */
export function ResultsEnvironment({
  business,
  needs,
  series = [],
  analyses = [],
}: {
  business: string;
  needs: StripNeed[];
  series?: MetricSeries[];
  analyses?: IrisAnalysis[];
}) {
  const shell = useShell();
  const last = lastDataDay(series);
  return (
    <div className="ps-v is-wide v4 rs" style={{ maxWidth: shell.layout.contentW }}>
      <EnvIdentity agent="iris" business={business} />
      <NeedsStrip items={needs} />
      {last === null ? <ResultsEmpty /> : <ResultsView business={business} series={series} last={last} analyses={analyses} />}
    </div>
  );
}

function ResultsEmpty() {
  const t = useTranslations("envs.iris");
  const shell = useShell();
  return (
    <section className="ps-emptybig rs-empty" aria-labelledby="rs-empty-t">
      <Agent agent="iris" size={64} />
      <h2 id="rs-empty-t">{t("emptyTitle")}</h2>
      <p>{t("emptyText")}</p>
      <ul className="rs-empty-l" aria-label={t("tracks")}>
        {KPIS.map((k) => (
          <li key={k}>{t(`kpis.${k}`)}</li>
        ))}
      </ul>
      <Button variant="primary" size="s" icon={null} href={`/app/${shell.workspace.slug}/memoria-da-marca`} linkAs={Link}>
        {t("connections")}
      </Button>
    </section>
  );
}

function Ic({ d, className = "sb-ic" }: { d: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function ResultsView({ business, series, last, analyses }: { business: string; series: MetricSeries[]; last: number; analyses: IrisAnalysis[] }) {
  const L = useLabels();
  const { t } = L;
  const shell = useShell();
  const [period, setPeriod] = useState<PeriodId>("month");
  const kpis = KPI_KEYS.map((k) => series.find((s) => seriesKey(s) === k)).filter((s): s is MetricSeries => !!s);
  const [picked, setPicked] = useState<string>(kpis[0] ? seriesKey(kpis[0]) : seriesKey(series[0]!));
  const selected = series.find((s) => seriesKey(s) === picked) ?? kpis[0] ?? series[0]!;
  const days = PERIOD_DAYS[period];
  const { current, previous } = periodRanges(last, days);
  const summaries = new Map(series.map((s) => [seriesKey(s), summarize(s, last, days)]));
  const hasPrevious = [...summaries.values()].some((s) => s.daysBefore > 0);
  const allSources = [...new Set(series.flatMap((s) => s.sources))];
  const href = `/app/${shell.workspace.slug}/squad/iris`;
  const periodText = t("contextPeriod", { label: t(`lastDays.${period}`), range: L.range(current.start, current.end) });
  const env = useEnvConversation("iris", business);
  const channels = [...series].sort((a, b) => order(seriesKey(a)) - order(seriesKey(b)));

  const talk = (s: MetricSeries) => {
    const title = L.label(s);
    const origin = t(`origin.${period}`);
    const context: ConversationContextRef = {
      kind: "metric",
      label: title,
      href,
      period: periodText,
      origin,
      ref: { type: "metric", key: seriesKey(s), title, period: periodText, origin },
    };
    shell.openConversation({ conversationId: null, agent: "iris", context });
  };
  const askCpc = () =>
    shell.openConversation({
      conversationId: shell.conversationIds.direct.iris ?? null,
      agent: "iris",
      draft: t("cpc.draft"),
      context: { kind: "env", label: t("envLabel"), href },
    });

  return (
    <>
      <div className="rs-bar">
        <div className="v4-seg" role="group" aria-label={t("periodGroup")}>
          {PERIODS.map((p) => (
            <button key={p} type="button" className={`v4-seg-b${p === period ? " is-on" : ""}`} aria-pressed={p === period} onClick={() => setPeriod(p)}>
              {t(`periods.${p}`)}
            </button>
          ))}
        </div>
        <span className="rs-per">
          <b>{L.range(current.start, current.end)}</b>
          <span>{hasPrevious ? t("compared", { range: L.range(previous.start, previous.end) }) : t("noPrevious")}</span>
        </span>
        <span className="ps-grow" />
        <span className="rs-src">
          <span className="rs-src-t">{t("sources", { sources: L.sources(allSources) })}</span>
        </span>
      </div>

      {kpis.length ? (
        <div className="rs-kpis">
          {kpis.map((s, i) => (
            <KpiTile
              key={seriesKey(s)}
              s={s}
              sum={summaries.get(seriesKey(s))!}
              lead={i === 0}
              on={seriesKey(s) === seriesKey(selected)}
              last={last}
              cmp={L.range(previous.start, previous.end)}
              pick={() => setPicked(seriesKey(s))}
              talk={() => talk(s)}
            />
          ))}
        </div>
      ) : null}

      <div className="rs-cpc">
        <span className="rs-cpc-k">{t("cpc.k")}</span>
        <span className="rs-cpc-v">{t("cpc.v")}</span>
        <span className="rs-cpc-t">{t("cpc.t", { business })}</span>
        <button type="button" className="hm-link is-soft" aria-label={t("cpc.askAria")} onClick={askCpc}>
          <Ic d={PRODUCT_ICONS.ask} />
          <span>{t("cpc.ask")}</span>
        </button>
      </div>

      <WeeklyChart s={selected} last={last} current={current} previous={hasPrevious ? previous : null} />

      <div className="v41-low is-3">
        <section className="v41-cd" aria-labelledby="rs-a-t">
          <header className="v41-cd-h">
            <h3 id="rs-a-t">{t("analyses.title")}</h3>
            {/* H2-10 (P-05): V4.6 L5354, `rs.an.talk` = `_openCtx('env', 'res')`, a conversa do ambiente de Resultados. */}
            <button type="button" className="v4-ask is-s" aria-label={t("analyses.talk")} data-tip={t("analyses.talkTip")} onClick={env.open}>
              <Ic d={PRODUCT_ICONS.ask} />
            </button>
          </header>
          {analyses.length ? (
            <div className="v41-rows">
              {analyses.map((a) => (
                <AnalysisRow key={a.id} a={a} />
              ))}
            </div>
          ) : (
            <p className="rs-none">{t("analyses.empty", { business })}</p>
          )}
        </section>
        <section className="v41-cd" aria-labelledby="rs-b-t">
          <header className="v41-cd-h">
            <h3 id="rs-b-t">{t("channelsCard.title")}</h3>
            {/* H2-10 (P-05): V4.6 L5358, `rs.chans.talk` = a conversa do primeiro canal da lista, o mesmo caminho das linhas. */}
            {channels[0] ? (
              <button type="button" className="v4-ask is-s" aria-label={t("channelsCard.talk")} data-tip={t("channelsCard.talkTip")} onClick={() => talk(channels[0]!)}>
                <Ic d={PRODUCT_ICONS.ask} />
              </button>
            ) : null}
          </header>
          <div className="rs-crs">
            {channels.map((s) => {
              const sum = summaries.get(seriesKey(s))!;
              const value = sum.now === null ? t("kpi.noData") : L.num(sum.now);
              const delta = sum.variation === null ? t("kpi.noCompare") : L.signed(sum.variation);
              return (
                <button
                  key={seriesKey(s)}
                  type="button"
                  className="rs-cr is-nobar"
                  aria-label={t("channelsCard.rowAria", { label: L.label(s), value, delta })}
                  onClick={() => talk(s)}
                >
                  <span className="rs-cr-l">{L.label(s)}</span>
                  <span className="rs-cr-m">{delta}</span>
                  <span className="rs-cr-v">
                    <b>{value}</b>
                    <small>{sum.stock ? t("kpi.lastValue") : L.unit(s)}</small>
                  </span>
                </button>
              );
            })}
          </div>
          <footer className="v41-cd-f">
            <small>{t("channelsCard.foot", { period: L.range(current.start, current.end), sources: t("sources", { sources: L.sources(allSources) }) })}</small>
          </footer>
        </section>
      </div>
    </>
  );
}

const order = (k: string) => {
  const i = SERIES_ORDER.indexOf(k);
  return i < 0 ? SERIES_ORDER.length : i;
};

function sparkPaths(weeks: Week[], w: number, h: number): { line: string; area: string } {
  const vals = weeks.map((x) => x.value);
  const max = Math.max(...vals.map((v) => v ?? 0), 1);
  const step = w / Math.max(weeks.length - 1, 1);
  return paths(vals, (i) => i * step, (v) => h - 2 - (h - 4) * (v / max), h);
}

/** Linha e área quebradas nas lacunas: semana sem dado completo não liga os pontos vizinhos. */
function paths(vals: (number | null)[], X: (i: number) => number, Y: (v: number) => number, base: number): { line: string; area: string } {
  let line = "";
  let area = "";
  let run: [number, number][] = [];
  const flush = () => {
    if (run.length) {
      line += run.map(([x, y], j) => `${j ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + " ";
      if (run.length > 1) {
        const first = run[0]!;
        const lastP = run[run.length - 1]!;
        area += `M${first[0].toFixed(1)} ${base} ` + run.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + ` L${lastP[0].toFixed(1)} ${base} Z `;
      }
    }
    run = [];
  };
  vals.forEach((v, i) => {
    if (v === null) flush();
    else run.push([X(i), Y(v)]);
  });
  flush();
  return { line: line.trim(), area: area.trim() };
}

function KpiTile({
  s,
  sum,
  lead,
  on,
  last,
  cmp,
  pick,
  talk,
}: {
  s: MetricSeries;
  sum: Summary;
  lead: boolean;
  on: boolean;
  last: number;
  cmp: string;
  pick: () => void;
  talk: () => void;
}) {
  const L = useLabels();
  const { t } = L;
  const label = L.label(s);
  const value = sum.now === null ? t("kpi.noData") : L.num(sum.now);
  const up = (sum.variation ?? 0) >= 0;
  const delta = sum.variation === null ? t("kpi.noCompare") : `${L.signed(sum.variation)} ${t("kpi.vs", { range: cmp })}`;
  const gaps = sum.daysNow < sum.days ? t("kpi.gaps", { count: sum.days - sum.daysNow }) : sum.daysBefore > 0 && sum.daysBefore < sum.days ? t("kpi.gapsPrev", { count: sum.days - sum.daysBefore }) : "";
  const sp = sparkPaths(weekly(s, last), 120, 34);
  return (
    <div className={`rs-k${on ? " is-on" : ""}${lead ? " is-lead" : ""}`}>
      <button
        type="button"
        className="rs-k-b"
        aria-pressed={on}
        aria-label={`${t("kpi.aria", { label, value, delta })}${gaps ? `, ${gaps}` : ""}. ${on ? t("kpi.ariaOn") : t("kpi.ariaOff")}`}
        onClick={pick}
      >
        <span className="rs-k-l">{label}</span>
        <b className={`rs-k-v${sum.now === null ? " is-none" : ""}`}>{value}</b>
        <span className="rs-k-d">
          {sum.variation === null ? (
            <small>{t("kpi.noCompare")}</small>
          ) : (
            <>
              <span className={`rs-d${up ? "" : " is-down"}`}>
                <Ic d={up ? PRODUCT_ICONS.up : PRODUCT_ICONS.down} />
                <span>{L.pct(sum.variation)}</span>
              </span>
              <small>{t("kpi.vs", { range: cmp })}</small>
            </>
          )}
          {on ? (
            <span className="rs-k-on">
              <i />
              {t("kpi.onChart")}
            </span>
          ) : null}
        </span>
        {gaps ? <small className="rs-k-gap">{gaps}</small> : null}
        <svg className="rs-k-sp" viewBox="0 0 120 34" preserveAspectRatio="none" aria-hidden="true">
          <path className="rs-sp-a" d={sp.area} />
          <path className="rs-sp-l" d={sp.line} />
        </svg>
      </button>
      <button type="button" className="v4-ask is-s rs-k-ask" aria-label={t("kpi.askAria", { label })} data-tip={t("kpi.ask")} onClick={talk}>
        <Ic d={PRODUCT_ICONS.ask} />
      </button>
    </div>
  );
}

const W = 760;
const H = 236;
const PL = 40;
const PR = 18;
const PT = 34;
const PB = 26;

function WeeklyChart({ s, last, current, previous }: { s: MetricSeries; last: number; current: { start: number; end: number }; previous: { start: number; end: number } | null }) {
  const L = useLabels();
  const { t } = L;
  const [table, setTable] = useState(false);
  const [hov, setHov] = useState(-1);
  const weeks = weekly(s, last);
  const n = weeks.length;
  const step = (W - PL - PR) / (n - 1);
  const vals = weeks.map((w) => w.value);
  const { top, step: tick } = niceScale(Math.max(...vals.map((v) => v ?? 0)));
  const X = (i: number) => PL + i * step;
  const Y = (v: number) => PT + (H - PT - PB) * (1 - v / top);
  const { line, area } = paths(vals, X, Y, H - PB);
  const start = weeks[0]!.start;
  const xDay = (d: number) => X((d - start + 0.5) / 7 - 0.5);
  const band = (r: { start: number; end: number }) => {
    const x1 = Math.max(PL - 6, xDay(r.start) - step / 14);
    const x2 = Math.min(W - PR + 6, xDay(r.end) + step / 14);
    return x2 > x1 ? { x: x1, w: x2 - x1 } : null;
  };
  const cur = band(current);
  const prev = previous ? band(previous) : null;
  // V4.6 `bLp`/`pLp` e `bTp` (L10821): no alto da faixa, a 0,6% da borda esquerda. O rótulo não passa da largura da
  // faixa (quebra a linha): na semana, as duas faixas estreitas não se sobrepõem nem saem do gráfico.
  const bandLabel = (b: { x: number; w: number }) => ({
    left: `${((b.x / W) * 100 + 0.6).toFixed(2)}%`,
    top: `${(((PT - 18) / H) * 100).toFixed(2)}%`,
    maxWidth: `${((b.w / W) * 100 - 1.2).toFixed(2)}%`,
  });
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += tick) ticks.push(v);
  const label = L.label(s);
  const unit = s.metric === "followers" ? t("kpi.lastValue") : L.unit(s);
  const lastWeek = weeks[n - 1]!;
  const aria =
    lastWeek.value === null
      ? t("chart.ariaNoLast", { label, from: L.day(start), to: L.day(lastWeek.end) })
      : t("chart.aria", { label, from: L.day(start), to: L.day(lastWeek.end), last: `${L.num(lastWeek.value)} ${unit}` });
  const hasGap = weeks.some((w) => w.value === null);
  const cellText = (w: Week) =>
    w.value !== null ? L.num(w.value) : w.partial !== null ? t("chart.partial", { days: w.daysWithData, value: L.num(w.partial) }) : t("chart.noData");
  const inRange = (w: Week, r: { start: number; end: number } | null) => !!r && w.end >= r.start && w.start <= r.end;
  const move = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width) return;
    const x = ((e.clientX - r.left) / r.width) * W;
    setHov(Math.max(0, Math.min(n - 1, Math.round((x - PL) / step))));
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setHov((h) => (h < 0 ? n - 1 : Math.max(0, Math.min(n - 1, h + (e.key === "ArrowLeft" ? -1 : 1)))));
  };
  const hw = hov >= 0 ? weeks[hov] : undefined;
  const hy = hw && hw.value !== null ? Y(hw.value) : H - PB;
  return (
    <section className="v4-card v41-main rs-ch" aria-labelledby="rs-ch-t">
      <header className="v4-ch">
        <div className="v4-ch-t">
          <h2 id="rs-ch-t">{label}</h2>
          <small>{t("chart.sub", { from: L.day(start), to: L.day(lastWeek.end) })}</small>
        </div>
        <div className="v4-ch-a">
          <span className="rs-lg" aria-hidden="true">
            <span>
              <i className="is-line" />
              {L.range(current.start, current.end)}
            </span>
            {prev && previous ? (
              <span>
                <i className="is-prev" />
                {L.range(previous.start, previous.end)}
              </span>
            ) : null}
          </span>
          <button type="button" className="hm-link is-soft" onClick={() => setTable((v) => !v)}>
            <span>{table ? t("chart.graph") : t("chart.table")}</span>
          </button>
        </div>
      </header>
      <div className="rs-chb">
        <div className="rs-chm">
          {table ? (
            <table className="ps-table rs-table">
              <thead>
                <tr>
                  <th scope="col">{t("chart.weekOf")}</th>
                  <th scope="col">{unit}</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => (
                  <tr key={w.start} className={inRange(w, current) ? "is-cur" : inRange(w, previous) ? "is-prev" : ""}>
                    <td>{L.day(w.start)}</td>
                    <td>{cellText(w)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            // A V4.6 lê o gráfico por hover e pelas setas (L10831); a tabela é a alternativa acessível.
            <div className="rs-box" tabIndex={0} role="img" aria-label={aria} onMouseMove={move} onMouseLeave={() => setHov(-1)} onKeyDown={key} onBlur={() => setHov(-1)}>
              <svg className="rs-svg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
                <defs>
                  <linearGradient id="rs-cg" x1="0" x2="0" y1="0" y2="1">
                    <stop className="rs-cg-a" offset="0" />
                    <stop className="rs-cg-b" offset="1" />
                  </linearGradient>
                </defs>
                {prev ? <rect className="rs-band-p" x={prev.x} y={PT - 22} width={prev.w} height={H - PB - PT + 22} rx={8} /> : null}
                {cur ? <rect className="rs-band" x={cur.x} y={PT - 22} width={cur.w} height={H - PB - PT + 22} rx={8} /> : null}
                {ticks.map((v) => (
                  <line key={v} className="rs-grid" x1={PL} x2={W - PR} y1={Y(v)} y2={Y(v)} />
                ))}
                <path className="rs-area" d={area} />
                <path className="rs-line" d={line} />
                {weeks.map((w, i) =>
                  w.value !== null && (i === n - 1 || ((vals[i - 1] ?? null) === null && (vals[i + 1] ?? null) === null)) ? (
                    <circle key={w.start} className="rs-end" cx={X(i)} cy={Y(w.value)} r={4.5} />
                  ) : null,
                )}
                {hw ? (
                  <>
                    <line className="rs-x" x1={X(hov)} x2={X(hov)} y1={PT - 4} y2={H - PB} />
                    {hw.value !== null ? <circle className="rs-hd" cx={X(hov)} cy={hy} r={5} /> : null}
                  </>
                ) : null}
              </svg>
              <div className="rs-lbls" aria-hidden="true">
                {ticks.map((v) => (
                  <span key={v} className="rs-cl is-y" style={{ top: `${((Y(v) / H) * 100).toFixed(2)}%` }}>
                    {L.format.number(v, { notation: "compact", maximumFractionDigits: 1 })}
                  </span>
                ))}
                {/* H2-10 (P-04): o nome de cada faixa no alto, à esquerda (V4.6 `bLp`/`pLp`, `bTp`), com o mesmo período da
                    legenda: as janelas aqui são de 7, 30 e 90 dias com as datas (A2b §4 item 27), não meses do calendário. */}
                {cur ? (
                  <span className="rs-cl is-band" style={bandLabel(cur)}>
                    {L.range(current.start, current.end)}
                  </span>
                ) : null}
                {prev && previous ? (
                  <span className="rs-cl is-band is-prev" style={bandLabel(prev)}>
                    {L.range(previous.start, previous.end)}
                  </span>
                ) : null}
                {weeks.map((w, i) =>
                  i % 2 === 1 || i === n - 1 ? (
                    <span key={w.start} className="rs-cl is-x" style={{ left: `${((X(i) / W) * 100).toFixed(2)}%`, top: `${(((H - PB + 8) / H) * 100).toFixed(2)}%` }}>
                      {L.day(w.start)}
                    </span>
                  ) : null,
                )}
              </div>
              {hw ? (
                <div className="rs-tip" style={{ left: `${Math.max(8, Math.min(92, (X(hov) / W) * 100)).toFixed(2)}%`, top: `${((hy / H) * 100).toFixed(2)}%` }}>
                  <b>{hw.value !== null ? `${L.num(hw.value)} ${unit}` : cellText(hw)}</b>
                  <span>{t("chart.tip", { day: L.day(hw.start) })}</span>
                </div>
              ) : null}
            </div>
          )}
          {hasGap ? <p className="rs-gap-n">{t("chart.gapNote")}</p> : null}
        </div>
      </div>
    </section>
  );
}

function AnalysisRow({ a }: { a: IrisAnalysis }) {
  const t = useTranslations("results");
  const tc = useTranslations("common");
  const type = tc(k(`deliveryTypes.d${a.type.replace(".", "")}`));
  const state = tc.has(k(`states.${a.status}`)) ? tc(k(`states.${a.status}`)) : a.status;
  return (
    <Link className="v41-row v41-doc" href={a.href}>
      <span className="v41-sheet" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="v41-row-t">
        <b>{a.title}</b>
        <small>{a.version !== null ? t("analyses.meta", { type, version: a.version, state }) : t("analyses.metaNoVersion", { type, state })}</small>
      </span>
    </Link>
  );
}

