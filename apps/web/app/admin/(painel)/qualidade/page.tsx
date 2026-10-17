import { unwrap } from "@hellosquad/contracts";
import { getAgent, isAgentId } from "@hellosquad/ui";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { FilterSelect } from "@/components/admin/Filters";
import { brDay } from "@/components/admin/economics";
import { monthRange, QUALITY_METRICS, qualityTotal, readDelta, recentMonths, type Reading } from "@/components/admin/quality";
import { AgentLabel, ApiProblem, Card, DataTable, Metrics, Note, Status } from "@/components/admin/ui";
import { adminRead, type QualityComparison, type QualityPromptVersionRow, type QualityRow } from "@/lib/admin";
import { adminFormat } from "@/lib/admin-format";
import { one } from "@/lib/admin-labels";
import { DELIVERY_OWNER, deliveryTypeKey, isDeliveryType } from "@/lib/delivery-types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.qualidade");
  return { title: t("title") };
}

type Search = Promise<Record<string, string | string[] | undefined>>;
const PERIODS = ["30", "90", "365"] as const;
const LOCALES = ["pt-BR", "en", "es"] as const;

/**
 * Qualidade das entregas (SA0 `qualidade.html` → `GET /admin/quality` e `GET /admin/quality/compare`): o mês corrente
 * contra o anterior (cartões), "Como ler" vindo do catálogo da API no idioma da tela, abas Por tipo, Por mês e Por
 * versão de prompt, e a comparação entre dois meses escolhidos (mede se uma mudança de prompt ou modelo melhorou).
 */
export default async function QualityPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const periodParam = one(sp.periodo);
  const period = PERIODS.find((p) => p === periodParam) ?? "90";
  const [t, tc, locale] = await Promise.all([getTranslations("admin"), getTranslations("common"), getLocale()]);
  const f = adminFormat(locale);
  const dash = t("common.dash");
  const today = brDay(0);
  const months = recentMonths(today);
  const pick = (v: string | undefined, fallback: string) => (v && months.includes(v) ? v : fallback);
  const b = pick(one(sp.b), months[0]!);
  const a = pick(one(sp.a), months[1]!);
  const apiLocale = LOCALES.find((l) => l === locale) ?? "pt-BR";
  const compareOf = (x: string, y: string) => {
    const ra = monthRange(x, today);
    const rb = monthRange(y, today);
    return adminRead(
      (api) =>
        unwrap(api.GET("/admin/quality/compare", { params: { query: { a_since: ra.since, a_until: ra.until, b_since: rb.since, b_until: rb.until } } })),
      "/admin/qualidade",
    );
  };
  const isDefault = a === months[1] && b === months[0];
  const [quality, latest, chosen] = await Promise.all([
    adminRead(
      (api) => unwrap(api.GET("/admin/quality", { params: { query: { since: brDay(Number(period) - 1), until: today, locale: apiLocale } } })),
      "/admin/qualidade",
    ),
    compareOf(months[1]!, months[0]!),
    isDefault ? Promise.resolve(null) : compareOf(a, b),
  ]);
  const compare = chosen ?? latest;

  if (!quality.ok) {
    return (
      <AdminPage nav="qualidade" title={t("qualidade.title")} desc={t("qualidade.desc")}>
        <ApiProblem label={t("common.apiDown")} message={quality.error.message} />
      </AdminPage>
    );
  }
  const q = quality.data;
  const monthLong = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const monthShort = new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" });
  const monthName = (m: string) => monthLong.format(new Date(`${m}-01T12:00:00Z`));
  const partial = (m: string) => (m === today.slice(0, 7) ? t("qualidade.until", { date: f.date(today) }) : null);
  const pct0 = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const pct1 = new Intl.NumberFormat(locale, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const dec = (v: number, d: number) => new Intl.NumberFormat(locale, { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
  const num = (v: string) => <span className="sa-num">{v}</span>;
  const two = (x: string, y: string) => (
    <>
      {x}
      <br />
      {y}
    </>
  );

  /* Valor de uma taxa da API no formato do SA0. */
  const rate = (key: (typeof QUALITY_METRICS)[number]["key"], v: string | null): string => {
    if (v === null) return dash;
    const n = Number(v);
    if (key === "approved_first_rate") return pct0.format(n);
    if (key === "not_approved_rate") return pct1.format(n);
    if (key === "adjustments_per_delivery") return dec(n, 2);
    if (key === "ai_cost_per_approved_usd") return f.usd(n);
    return dec(n, 1);
  };
  const deltaText = (m: (typeof QUALITY_METRICS)[number], shown: number | null): string => {
    if (shown === null) return dash;
    const sign = shown > 0 ? "+" : shown < 0 ? "−" : "";
    const abs = Math.abs(shown);
    if (m.unit === "usd") return `${sign}${f.usd(abs)}`;
    if (m.unit === "pp") return t("qualidade.pp", { v: `${sign}${dec(abs, m.digits)}` });
    if (m.unit === "per100") return t("qualidade.per100", { v: `${sign}${dec(abs, m.digits)}` });
    return `${sign}${dec(abs, m.digits)}`;
  };
  const readingNode = (r: Reading) =>
    r === "better" ? (
      <Status kind="done" small>
        {t("qualidade.better")}
      </Status>
    ) : r === "worse" ? (
      <Status kind="you" small>
        {t("qualidade.worse")}
      </Status>
    ) : (
      <span className="sa-mut">{r === "same" ? t("qualidade.same") : dash}</span>
    );
  const count = (n: number, sub: string) => (
    <div className="sa-cell-m sa-cell-end">
      <span className="sa-num">{f.int(n)}</span>
      <small>{sub}</small>
    </div>
  );
  const per100 = (n: number, deliveries: number) => (deliveries ? t("qualidade.per100Short", { v: dec((n / deliveries) * 100, 1) }) : dash);

  const deliveryCell = (code: string) => {
    const key = deliveryTypeKey(code);
    const name = key && tc.has(`deliveryTypes.${key}` as never) ? tc(`deliveryTypes.${key}` as never) : null;
    const agent = isDeliveryType(code) ? DELIVERY_OWNER[code] : null;
    return (
      <div className="sa-cell-m">
        <b>{name ?? code}</b>
        <small>
          <span className="sa-code">{code}</span>
          {agent ? ` · ${getAgent(agent).name}` : ""}
        </small>
      </div>
    );
  };

  /* ---------- cartões: mês corrente contra o anterior */
  const top = latest.ok ? latest.data : null;
  const cards = top
    ? QUALITY_METRICS.map((m) => {
        const { reading, shown } = readDelta(top.delta[m.key], m.better, m.scale, m.digits);
        const word = reading === "none" ? dash : t(`qualidade.word.${reading}`);
        const prevName = monthName(months[1]!);
        const counted = m.key === "not_approved_rate" ? top.b.totals.not_approved : m.key === "agent_errors_per_100" ? top.b.totals.agent_errors : m.key === "failed_calls_per_100" ? top.b.totals.failed_steps : null;
        return {
          label: t(`qualidade.metric.${m.key}`),
          value: counted === null ? rate(m.key, top.b.rates[m.key]) : f.int(counted),
          unit: m.key === "not_approved_rate" ? t("qualidade.ofN", { n: top.b.totals.deliveries }) : undefined,
          detail:
            top.a.rates[m.key] === null || top.b.rates[m.key] === null
              ? t("qualidade.cardNone", { month: prevName })
              : counted === null
                ? t("qualidade.cardDelta", { delta: deltaText(m, shown), month: prevName, word })
                : t("qualidade.cardRate", { now: rate(m.key, top.b.rates[m.key]), unit: t(`qualidade.unit.${m.unit}`), before: rate(m.key, top.a.rates[m.key]), month: prevName, word }),
        };
      })
    : [];

  /* ---------- por tipo */
  const byType = [...q.by_type].sort((x, y) => (x.key < y.key ? -1 : 1));
  const tot = qualityTotal(byType);
  const typeFoot = byType.length ? (
    <tr>
      <td>
        <div className="sa-cell-m">
          <span>{t("qualidade.total")}</span>
          <small>{t("qualidade.types", { n: byType.length })}</small>
        </div>
      </td>
      <td className="is-r">{num(f.int(tot.deliveries))}</td>
      <td className="is-r">{num(tot.firstRate === null ? dash : pct0.format(tot.firstRate))}</td>
      <td className="is-r">{num(tot.adjustments === null ? dash : dec(tot.adjustments, 2))}</td>
      <td className="is-r">{num(f.int(tot.notApproved))}</td>
      <td className="is-r">{num(tot.costPerApproved === null ? dash : f.usd(tot.costPerApproved))}</td>
      <td className="is-r">{num(f.int(tot.agentErrors))}</td>
      <td className="is-r">{num(f.int(tot.failedSteps))}</td>
    </tr>
  ) : null;
  const rowRate = (r: QualityRow, k: "approved_first_time" | "adjustments") => (r.deliveries ? r[k] / r.deliveries : null);
  const typePanel = (
    <Card id="ql-tipo" title={t("qualidade.byType")} sub={t("qualidade.byTypeSub", { period: t(`qualidade.periods.${period}`), n: byType.length })} flush>
      <DataTable<QualityRow>
        caption={t("qualidade.byType")}
        rows={byType}
        rowKey={(r) => r.key}
        empty={t("qualidade.empty")}
        foot={typeFoot}
        columns={[
          { key: "type", label: t("qualidade.colType"), cell: (r) => deliveryCell(r.key) },
          { key: "n", label: t("qualidade.colDeliveries"), align: "r", cell: (r) => num(f.int(r.deliveries)) },
          { key: "first", label: two(t("qualidade.colFirst1"), t("qualidade.colFirst2")), align: "r", cell: (r) => num(rowRate(r, "approved_first_time") === null ? dash : pct0.format(rowRate(r, "approved_first_time")!)) },
          { key: "adj", label: two(t("qualidade.colAdj1"), t("qualidade.colAdj2")), align: "r", cell: (r) => num(rowRate(r, "adjustments") === null ? dash : dec(rowRate(r, "adjustments")!, 2)) },
          { key: "not", label: two(t("qualidade.colNot1"), t("qualidade.colNot2")), align: "r", cell: (r) => num(f.int(r.not_approved)) },
          { key: "cost", label: two(t("qualidade.colCost1"), t("qualidade.colCost2")), align: "r", cell: (r) => num(r.ai_cost_per_approved_usd === null ? dash : f.usd(r.ai_cost_per_approved_usd)) },
          { key: "err", label: two(t("qualidade.colErr1"), t("qualidade.colErr2")), align: "r", cell: (r) => num(f.int(r.agent_errors)) },
          { key: "fail", label: two(t("qualidade.colFail1"), t("qualidade.colFail2")), align: "r", cell: (r) => num(f.int(r.failed_steps)) },
        ]}
      />
      <p className="sa-card-note">{t("qualidade.byTypeNote")}</p>
    </Card>
  );

  /* ---------- por mês */
  const monthPanel = (
    <Card id="ql-mes" title={t("qualidade.byMonth")} sub={t("qualidade.byMonthSub")} flush>
      <DataTable<QualityRow>
        caption={t("qualidade.byMonth")}
        rows={q.by_month}
        rowKey={(r) => r.key}
        empty={t("qualidade.empty")}
        columns={[
          {
            key: "m",
            label: t("qualidade.colMonth"),
            nowrap: true,
            cell: (r) => (
              <div className="sa-cell-m">
                <b>{monthName(r.key)}</b>
                <small>{partial(r.key) ?? t("qualidade.wholeMonth")}</small>
              </div>
            ),
          },
          { key: "n", label: t("qualidade.colDeliveries"), align: "r", cell: (r) => num(f.int(r.deliveries)) },
          { key: "first", label: two(t("qualidade.colFirst1"), t("qualidade.colFirst2")), align: "r", cell: (r) => num(r.deliveries ? pct0.format(r.approved_first_time / r.deliveries) : dash) },
          { key: "adj", label: two(t("qualidade.colAdj1"), t("qualidade.colAdj2")), align: "r", cell: (r) => num(r.deliveries ? dec(r.adjustments / r.deliveries, 2) : dash) },
          { key: "not", label: two(t("qualidade.colNot1"), t("qualidade.colNot2")), align: "r", cell: (r) => count(r.not_approved, r.deliveries ? pct1.format(r.not_approved / r.deliveries) : dash) },
          { key: "cost", label: two(t("qualidade.colCost1"), t("qualidade.colCost2")), align: "r", cell: (r) => num(r.ai_cost_per_approved_usd === null ? dash : f.usd(r.ai_cost_per_approved_usd)) },
          { key: "err", label: two(t("qualidade.colErr1"), t("qualidade.colErr2")), align: "r", cell: (r) => count(r.agent_errors, per100(r.agent_errors, r.deliveries)) },
          { key: "fail", label: two(t("qualidade.colFail1"), t("qualidade.colFail2")), align: "r", cell: (r) => count(r.failed_steps, per100(r.failed_steps, r.deliveries)) },
        ]}
      />
    </Card>
  );

  /* ---------- por versão de prompt (o "o que mudou" do SA0: a versão que produziu a primeira entrega) */
  const sources = (v: QualityPromptVersionRow) =>
    v.sources.length ? (
      <span className="sa-chips">
        {v.sources.map((s, i) => (
          <span key={`${s.kind}-${s.key}-${i}`} className="sa-chip is-mono">
            {[s.kind, s.key, s.version !== null && s.version !== undefined ? `v${s.version}` : null].filter(Boolean).join(" ")}
          </span>
        ))}
      </span>
    ) : (
      <span className="sa-mut">{dash}</span>
    );
  const versionPanel = (
    <Card id="ql-versao" title={t("qualidade.byVersion")} sub={t("qualidade.byVersionSub")} flush>
      <DataTable<QualityPromptVersionRow>
        caption={t("qualidade.byVersion")}
        rows={q.by_prompt_version}
        rowKey={(v) => `${v.agent_id}-${v.prompt_version}-${v.key}`}
        empty={t("qualidade.emptyVersions")}
        columns={[
          { key: "agent", label: t("qualidade.colAgent"), nowrap: true, cell: (v) => (isAgentId(v.agent_id) ? <AgentLabel agent={v.agent_id} name={getAgent(v.agent_id).name} /> : v.agent_id) },
          { key: "type", label: t("qualidade.colType"), cell: (v) => deliveryCell(v.key) },
          {
            key: "hash",
            label: t("qualidade.colVersion"),
            cell: (v) => (
              <div className="sa-cell-m">
                <span className="sa-code">{v.prompt_version}</span>
                <small>{v.origin ? t.has(`qualidade.origin.${v.origin}` as never) ? t(`qualidade.origin.${v.origin}` as never) : v.origin : dash}</small>
              </div>
            ),
          },
          { key: "src", label: t("qualidade.colSources"), cell: sources },
          { key: "first", label: t("qualidade.colFirstUsed"), nowrap: true, cell: (v) => (v.first_used_at ? f.date(v.first_used_at) : dash) },
          { key: "n", label: t("qualidade.colDeliveries"), align: "r", cell: (v) => num(f.int(v.deliveries)) },
          { key: "firstRate", label: two(t("qualidade.colFirst1"), t("qualidade.colFirst2")), align: "r", cell: (v) => num(v.deliveries ? pct0.format(v.approved_first_time / v.deliveries) : dash) },
          { key: "adj", label: two(t("qualidade.colAdj1"), t("qualidade.colAdj2")), align: "r", cell: (v) => num(v.deliveries ? dec(v.adjustments / v.deliveries, 2) : dash) },
          { key: "cost", label: two(t("qualidade.colCost1"), t("qualidade.colCost2")), align: "r", cell: (v) => num(v.ai_cost_per_approved_usd === null ? dash : f.usd(v.ai_cost_per_approved_usd)) },
        ]}
      />
    </Card>
  );

  /* ---------- comparar dois meses */
  const monthOptions = months.map((m) => ({ value: m, label: monthShort.format(new Date(`${m}-01T12:00:00Z`)) }));
  type CmpLine = { key: string; label: string; a: string; b: string; delta: string; reading: Reading | "volume" };
  const cmpLines = (c: QualityComparison): CmpLine[] => [
    {
      key: "deliveries",
      label: t("qualidade.colDeliveries"),
      a: f.int(c.a.totals.deliveries),
      b: f.int(c.b.totals.deliveries),
      delta: `${c.b.totals.deliveries - c.a.totals.deliveries > 0 ? "+" : c.b.totals.deliveries < c.a.totals.deliveries ? "−" : ""}${f.int(Math.abs(c.b.totals.deliveries - c.a.totals.deliveries))}`,
      reading: "volume",
    },
    ...QUALITY_METRICS.map((m) => {
      const { reading, shown } = readDelta(c.delta[m.key], m.better, m.scale, m.digits);
      return { key: m.key, label: t(`qualidade.metric.${m.key}`), a: rate(m.key, c.a.rates[m.key]), b: rate(m.key, c.b.rates[m.key]), delta: deltaText(m, shown), reading };
    }),
  ];
  const versionsOf = (c: QualityComparison["a"]) =>
    c.prompt_versions.length ? c.prompt_versions.map((v) => `${isAgentId(v.agent_id) ? getAgent(v.agent_id).name : v.agent_id} ${v.prompt_version}`).join(" · ") : dash;
  const comparePanel = compare.ok ? (
    (() => {
      const lines = cmpLines(compare.data);
      const betterN = lines.filter((l) => l.reading === "better").length;
      const worseN = lines.filter((l) => l.reading === "worse").length;
      return (
        <>
          <div className="sa-card-lead">
            <p>{t("qualidade.cmpSummary", { betterN, worseN, total: QUALITY_METRICS.length, month: monthName(a) })}</p>
            <p className="sa-mut">{t("qualidade.cmpVersions", { month: monthName(a), versions: versionsOf(compare.data.a) })}</p>
            <p className="sa-mut">{t("qualidade.cmpVersions", { month: monthName(b), versions: versionsOf(compare.data.b) })}</p>
          </div>
          <DataTable<CmpLine>
            caption={t("qualidade.cmpCaption", { a: monthName(a), b: monthName(b) })}
            rows={lines}
            rowKey={(l) => l.key}
            empty={t("qualidade.empty")}
            columns={[
              { key: "l", label: t("qualidade.colMetric"), cell: (l) => <b>{l.label}</b> },
              { key: "a", label: monthName(a), align: "r", cell: (l) => num(l.a) },
              { key: "b", label: partial(b) ? `${monthName(b)} (${partial(b)})` : monthName(b), align: "r", cell: (l) => num(l.b) },
              { key: "d", label: t("qualidade.colDelta"), align: "r", cell: (l) => <b className="sa-num">{l.delta}</b> },
              { key: "r", label: t("qualidade.colReading"), cell: (l) => (l.reading === "volume" ? <span className="sa-mut">{t("qualidade.volume")}</span> : readingNode(l.reading)) },
            ]}
          />
          <p className="sa-card-note">{t("qualidade.cmpNote")}</p>
        </>
      );
    })()
  ) : (
    <ApiProblem label={t("common.apiDown")} message={compare.error.message} />
  );

  return (
    <AdminPage nav="qualidade" title={t("qualidade.title")} desc={t("qualidade.desc")}>
      <div className="sa-tool" style={{ marginBottom: 16 }}>
        <FilterSelect
          name="periodo"
          title={t("qualidade.period")}
          prefix={t("qualidade.period")}
          options={(["90", "30", "365"] as const).map((p) => ({ value: p === "90" ? "" : p, label: t(`qualidade.periods.${p}`) }))}
        />
        <span className="sa-mut sa-fx">{t("qualidade.range", { since: f.date(q.since), until: f.date(q.until) })}</span>
      </div>
      <div className="sa-sec-t" style={{ marginTop: 0 }}>
        <h2>{partial(months[0]!) ? `${monthName(months[0]!)}, ${partial(months[0]!)}` : monthName(months[0]!)}</h2>
        <small>
          {top
            ? t("qualidade.topSub", { n: top.b.totals.deliveries, month: monthName(months[1]!), beforeN: top.a.totals.deliveries })
            : t("common.apiDown")}
        </small>
      </div>
      {cards.length ? <Metrics cols={3} items={cards} /> : null}
      <Card id="como-ler" title={t("qualidade.howTitle")} sub={t("qualidade.howSub")}>
        <div className="sa-row c3 ql-how">
          {q.how_to_read
            .filter((h) => h.key !== "rates")
            .map((h) => (
              <div key={h.key}>
                <b>{h.title}</b>
                <p>{h.text}</p>
              </div>
            ))}
        </div>
        {q.how_to_read
          .filter((h) => h.key === "rates")
          .map((h) => (
            <p key={h.key} className="ql-how-foot">
              {h.text}
            </p>
          ))}
      </Card>
      <AdminTabs
        idPrefix="ql"
        label={t("qualidade.tabsLabel")}
        tabs={[
          { id: "tipo", label: t("qualidade.tabType"), panel: typePanel },
          { id: "mes", label: t("qualidade.tabMonth"), panel: monthPanel },
          { id: "versao", label: t("qualidade.tabVersion"), panel: versionPanel },
        ]}
      />
      <Card
        id="comparar"
        title={t("qualidade.cmpTitle")}
        sub={t("qualidade.cmpSub")}
        actions={
          <span className="sa-tags">
            <FilterSelect name="a" title={t("qualidade.cmpA")} prefix={t("qualidade.cmpA")} options={monthOptions.filter((o) => o.value !== b)} right />
            <FilterSelect name="b" title={t("qualidade.cmpB")} prefix={t("qualidade.cmpB")} options={monthOptions.filter((o) => o.value !== a)} right />
          </span>
        }
        flush
      >
        {comparePanel}
      </Card>
      <Note label={t("qualidade.noteLabel")}>{t("qualidade.note")}</Note>
    </AdminPage>
  );
}
