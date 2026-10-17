import { unwrap } from "@hellosquad/contracts";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPage } from "@/components/admin/AdminPage";
import { FilterSelect } from "@/components/admin/Filters";
import { brDay, ECONOMIC_METRICS, metricFormat, readingState, type EconomicMetric } from "@/components/admin/economics";
import { ApiProblem, Card, DataTable, Metrics, Note, Status, Tag } from "@/components/admin/ui";
import { adminRead, type AlertRule, type ConsumptionBucket, type ConsumptionResponse, type ConsumptionRow } from "@/lib/admin";
import { adminFormat } from "@/lib/admin-format";
import { hrefWith, one } from "@/lib/admin-labels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.consumo");
  return { title: t("title") };
}

type Search = Promise<Record<string, string | string[] | undefined>>;
const PERIODS = ["30", "7"] as const;
const GROUPS = { dia: "day", semana: "week", mes: "month" } as const;
type GroupParam = keyof typeof GROUPS;

/** Marca "Proposta" das faixas (a mesma marcação `[PROPOSTA]` das Regras de negócio, `Tag` tracejada do DS). */
function ProposalMark({ label }: { label: string }) {
  return (
    <span className="sa-mk is-proposta">
      <span className="hs-tag hs-tag--sim">{label}</span>
    </span>
  );
}

/**
 * Consumo por cliente (SA0 `consumo.html` → `GET /admin/consumption`): por conta e período, solicitações, créditos
 * cobrados, custo de IA em entregas e em conversa, IA por crédito, margem bruta estimada e tendência do custo por turno;
 * alertas econômicos com as faixas da API, todas marcadas "Proposta"; a série do conjunto por dia, semana ou mês. A API
 * decide o que está fora da faixa; a tela só mostra, e nada muda automaticamente.
 */
export default async function ConsumptionPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const period = one(sp.periodo) === "7" ? "7" : "30";
  const groupParam: GroupParam = (Object.keys(GROUPS) as GroupParam[]).find((g) => g === one(sp.agrupar)) ?? "semana";
  const workspace_id = one(sp.conta);
  const [t, locale] = await Promise.all([getTranslations("admin"), getLocale()]);
  const f = adminFormat(locale);
  const fm = metricFormat(locale);
  const dash = t("common.dash");
  const since = brDay(Number(period) - 1);
  const until = brDay(0);
  const [consumption, accounts] = await Promise.all([
    adminRead(
      (api) =>
        unwrap(api.GET("/admin/consumption", { params: { query: { since, until, workspace_id, granularity: GROUPS[groupParam] } } })),
      "/admin/consumo",
    ),
    adminRead((api) => unwrap(api.GET("/admin/accounts", { params: { query: { limit: 100 } } })), "/admin/consumo"),
  ]);
  const keep = { periodo: period === "30" ? undefined : period, conta: workspace_id, agrupar: groupParam === "semana" ? undefined : groupParam };
  const link = (patch: Record<string, string | undefined>) => hrefWith("/admin/consumo", { ...keep, ...patch });
  const desc = t.rich("consumo.desc", { b: (c) => <b>{c}</b> });

  if (!consumption.ok) {
    return (
      <AdminPage nav="consumo" title={t("consumo.title")} desc={desc}>
        <ApiProblem label={t("common.apiDown")} message={consumption.error.message} />
      </AdminPage>
    );
  }
  const c: ConsumptionResponse = consumption.data;
  const usdBrl = c.usd_brl === null ? null : Number(c.usd_brl);
  const ref = c.margin_basis.credit_reference_brl === null ? null : Number(c.margin_basis.credit_reference_brl);
  const fx = c.margin_basis.exchange_rate;
  const tot = c.totals;
  const credits = Number(tot.credits_charged);
  const aiUsd = Number(tot.ai_cost_usd);
  const brl = (usd: number | string) => (usdBrl === null ? dash : f.money(Number(usd) * usdBrl, "BRL"));
  const rules = new Map<EconomicMetric, AlertRule>(c.alert_rules.map((r) => [r.metric, r]));
  const trendDays = rules.get("cost_per_turn_trend")?.window_days ?? 7;
  const rows = c.items;
  const inAttention = rows.filter((r) => r.economics.alerts.length > 0);
  const periodLabel = t(`consumo.periods.${period}`);
  const proposal = t("codes.mark.proposal");
  const provisionalF = t("consumo.provisionalF");
  const value = (m: EconomicMetric, v: string | null) => fm(m, v) ?? dash;
  const ruleText = (r: AlertRule) =>
    t(`consumo.rule.${r.metric}`, {
      cmp: t(`codes.comparison.${r.comparison}`),
      value: fm(r.metric, r.threshold) ?? r.threshold,
      ref: r.credit_reference_brl === null ? dash : f.money(r.credit_reference_brl, "BRL"),
      days: r.window_days ?? trendDays,
    });

  /* Como a leitura do conjunto saiu (SA0: a conta escrita embaixo do número). */
  const how = (m: EconomicMetric): string => {
    if (c.economics[m] === null) return t(`consumo.none.${m}`);
    if (m === "ai_cost_per_credit_brl") return t("consumo.how.ai_cost_per_credit_brl", { brl: brl(aiUsd), credits: f.credits(credits) });
    if (m === "gross_margin") {
      return t("consumo.how.gross_margin", {
        brl: brl(aiUsd),
        revenue: ref === null ? dash : f.money(credits * ref, "BRL"),
        credits: f.credits(credits),
        ref: ref === null ? dash : f.money(ref, "BRL"),
      });
    }
    const base = c.trend_accounts > 1 ? t("consumo.how.trendMany", { days: trendDays, n: c.trend_accounts }) : t("consumo.how.trend", { days: trendDays });
    const turn = c.economics.cost_per_turn_usd === null ? "" : ` ${t("consumo.how.turn", { usd: f.usd(c.economics.cost_per_turn_usd, 4) })}`;
    return `${base}${turn}`;
  };

  const alertCards = ECONOMIC_METRICS.map((m) => {
    const rule = rules.get(m);
    const state = readingState(c.economics, m);
    const out = rows.filter((r) => r.economics.alerts.some((a) => a.metric === m));
    const anyReading = rows.some((r) => r.economics[m] !== null);
    return (
      <Card
        key={m}
        id={`alerta-${m}`}
        title={t(`codes.metric.${m}`)}
        h3
        className="sa-alert"
        actions={
          <span className="sa-tags">
            {m === "gross_margin" && c.margin_basis.provisional ? <Tag kind="sim">{provisionalF}</Tag> : null}
            {state === "none" ? (
              <span className="sa-lbl">{t("consumo.noData")}</span>
            ) : (
              <Status kind={state === "ok" ? "done" : "you"}>{state === "ok" ? t("consumo.ok") : t("consumo.attention")}</Status>
            )}
          </span>
        }
      >
        <div className="sa-met-v sa-alert-v">{value(m, c.economics[m])}</div>
        <p className="sa-alert-how">{how(m)}</p>
        {rule ? (
          <div className="sa-alert-rule">
            <ProposalMark label={proposal} />
            <span>{ruleText(rule)}</span>
          </div>
        ) : (
          <p className="sa-mut">{t("consumo.noRule")}</p>
        )}
        <div className="sa-alert-out">
          <span className="sa-lbl">{t("consumo.inAttention", { n: out.length })}</span>
          {out.length ? (
            <ul className="sa-list">
              {out.map((r) => (
                <li key={r.workspace_id} className="sa-li">
                  <span className="sa-grow">
                    <a className="sa-rowlink" href={`/admin/contas/${r.workspace_id}`}>
                      {r.workspace_name}
                    </a>
                  </span>
                  <b className="sa-num">{value(m, r.economics[m])}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sa-mut">{anyReading ? t("consumo.noneOut") : t("consumo.noneEval")}</p>
          )}
        </div>
      </Card>
    );
  });

  const alertCell = (r: ConsumptionRow) => {
    const readings = ECONOMIC_METRICS.filter((m) => r.economics[m] !== null);
    if (!readings.length) {
      return (
        <div className="sa-cell-m">
          <span className="sa-mut">{dash}</span>
          <small>{Number(r.credits_charged) ? t("consumo.rowNoData") : t("consumo.rowNoCredit")}</small>
        </div>
      );
    }
    if (!r.economics.alerts.length) {
      return (
        <Status kind="done" small>
          {t("consumo.ok")}
        </Status>
      );
    }
    return (
      <div className="sa-cell-m sa-cell-top">
        <Status kind="you" small>
          {t("consumo.attention")}
        </Status>
        <small>{r.economics.alerts.map((a) => t(`codes.metricShort.${a.metric}`)).join(" · ")}</small>
      </div>
    );
  };

  const two = (a: string, b: string) => (
    <>
      {a}
      <br />
      {b}
    </>
  );
  const num = (v: string) => <span className="sa-num">{v}</span>;
  const foot = rows.length ? (
    <tr>
      <td>
        <div className="sa-cell-m">
          <span>{t("consumo.total")}</span>
          <small>{t("consumo.accounts", { n: rows.length })}</small>
        </div>
      </td>
      <td className="is-r">{num(f.int(tot.requests))}</td>
      <td className="is-r">{num(f.credits(tot.credits_charged))}</td>
      <td className="is-r">{num(f.usd(tot.ai_cost_deliveries_usd))}</td>
      <td className="is-r">{num(f.usd(tot.ai_cost_conversation_usd))}</td>
      <td className="is-r">{num(value("ai_cost_per_credit_brl", c.economics.ai_cost_per_credit_brl))}</td>
      <td className="is-r">{num(value("gross_margin", c.economics.gross_margin))}</td>
      <td className="is-r">{num(value("cost_per_turn_trend", c.economics.cost_per_turn_trend))}</td>
      <td>
        <small>{t("consumo.inAttentionFoot", { n: inAttention.length })}</small>
      </td>
    </tr>
  ) : null;

  const monthFmt = new Intl.DateTimeFormat(locale, { month: "2-digit", year: "numeric", timeZone: "UTC" });
  const bucketLabel = (b: ConsumptionBucket) =>
    groupParam === "mes"
      ? monthFmt.format(new Date(`${b.period_start}T12:00:00Z`))
      : groupParam === "semana"
        ? t("consumo.weekOf", { date: f.date(b.period_start) })
        : f.date(b.period_start);

  const accountOptions = [
    { value: "", label: t("common.allF") },
    ...(accounts.ok ? accounts.data.items.map((a) => ({ value: a.id, label: a.name })) : []),
  ];
  const conversationShare = aiUsd ? Number(tot.ai_cost_conversation_usd) / aiUsd : null;
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });

  return (
    <AdminPage nav="consumo" title={t("consumo.title")} desc={desc}>
      <div className="sa-tool" style={{ marginBottom: 16 }}>
        <nav className="sa-segl" aria-label={t("consumo.period")}>
          {PERIODS.map((p) => (
            <a key={p} href={link({ periodo: p === "30" ? undefined : p })} aria-current={period === p ? "page" : undefined}>
              {t(`consumo.periods.${p}`)}
            </a>
          ))}
        </nav>
        <FilterSelect name="conta" title={t("consumo.account")} prefix={t("consumo.account")} options={accountOptions} />
        <span className="sa-grow" />
        <span className="sa-mut sa-fx">
          {fx
            ? t("consumo.fx", { date: f.date(fx.fx_date), brl: f.money(fx.usd_brl, "BRL"), source: fx.fx_source })
            : t("consumo.fxNone")}
        </span>
      </div>
      <p className="sa-mut" style={{ margin: "0 0 12px" }}>
        {t("consumo.range", { since: f.date(c.since), until: f.date(c.until) })}
      </p>
      <Metrics
        items={[
          { label: t("consumo.metRequests"), value: f.int(tot.requests), detail: t("consumo.metRequestsSub", { n: rows.length }) },
          {
            label: t("consumo.metCredits"),
            value: f.credits(tot.credits_charged),
            detail: ref === null ? undefined : t("consumo.metCreditsSub", { brl: f.money(credits * ref, "BRL"), ref: f.money(ref, "BRL") }),
          },
          { label: t("consumo.metDeliveries"), value: f.usd(tot.ai_cost_deliveries_usd), detail: t("consumo.metDeliveriesSub", { brl: brl(tot.ai_cost_deliveries_usd) }) },
          {
            label: t("consumo.metConversation"),
            value: f.usd(tot.ai_cost_conversation_usd),
            detail: conversationShare === null ? t("consumo.metConversationSubNone") : t("consumo.metConversationSub", { share: pct.format(conversationShare) }),
          },
          {
            label: t("consumo.metPerCredit"),
            value: value("ai_cost_per_credit_brl", c.economics.ai_cost_per_credit_brl),
            detail: c.economics.ai_cost_per_credit_brl === null ? t("consumo.metPerCreditNone") : t("consumo.metPerCreditSub"),
          },
        ]}
      />
      <div className="sa-sec-t">
        <h2>{t("consumo.alertsTitle")}</h2>
        <small>{t("consumo.alertsSub")}</small>
      </div>
      <div className="sa-row c3 is-eq">{alertCards}</div>
      {c.margin_basis.provisional ? (
        <Note kind="draft" label={t("common.provisional")}>
          {fx
            ? t("consumo.marginNote", { ref: ref === null ? dash : f.money(ref, "BRL"), date: f.date(fx.fx_date), brl: f.money(fx.usd_brl, "BRL") })
            : t("consumo.marginNoteNoFx", { ref: ref === null ? dash : f.money(ref, "BRL") })}
        </Note>
      ) : null}
      <Card id="cs-clientes" title={t("consumo.byClient")} sub={t("consumo.byClientSub", { period: periodLabel, n: rows.length })} flush>
        <DataTable<ConsumptionRow>
          caption={t("consumo.byClientCaption", { period: periodLabel })}
          rows={rows}
          rowKey={(r) => r.workspace_id}
          empty={workspace_id ? t("consumo.emptyAccount") : t("consumo.empty")}
          foot={foot}
          columns={[
            {
              key: "account",
              label: t("consumo.colAccount"),
              cell: (r) => (
                <a className="sa-rowlink" href={`/admin/contas/${r.workspace_id}`}>
                  {r.workspace_name}
                </a>
              ),
            },
            { key: "req", label: t("consumo.colRequests"), align: "r", cell: (r) => num(f.int(r.requests)) },
            { key: "cred", label: two(t("consumo.colCredits1"), t("consumo.colCredits2")), align: "r", cell: (r) => num(f.credits(r.credits_charged)) },
            { key: "deliv", label: two(t("consumo.colAi"), t("consumo.colDeliveries")), align: "r", cell: (r) => num(f.usd(r.ai_cost_deliveries_usd)) },
            { key: "conv", label: two(t("consumo.colAi"), t("consumo.colConversation")), align: "r", cell: (r) => num(f.usd(r.ai_cost_conversation_usd)) },
            { key: "ia", label: two(t("consumo.colPerCredit1"), t("consumo.colPerCredit2")), align: "r", cell: (r) => num(value("ai_cost_per_credit_brl", r.economics.ai_cost_per_credit_brl)) },
            { key: "margin", label: two(t("consumo.colMargin1"), t("consumo.colMargin2")), align: "r", cell: (r) => num(value("gross_margin", r.economics.gross_margin)) },
            { key: "trend", label: two(t("consumo.colTrend1"), t("consumo.colTrend2", { days: trendDays })), align: "r", cell: (r) => num(value("cost_per_turn_trend", r.economics.cost_per_turn_trend)) },
            { key: "alert", label: t("consumo.colAlert"), cell: alertCell },
          ]}
        />
      </Card>
      <Card
        id="cs-periodo"
        title={t("consumo.series")}
        sub={t("consumo.seriesSub", { period: periodLabel })}
        actions={
          <nav className="sa-segl" aria-label={t("consumo.group")}>
            {(Object.keys(GROUPS) as GroupParam[]).map((g) => (
              <a key={g} href={link({ agrupar: g === "semana" ? undefined : g })} aria-current={groupParam === g ? "page" : undefined}>
                {t(`consumo.groups.${g}`)}
              </a>
            ))}
          </nav>
        }
        flush
      >
        <DataTable<ConsumptionBucket>
          caption={t("consumo.seriesCaption", { period: periodLabel, group: t(`consumo.groups.${groupParam}`) })}
          rows={c.series}
          rowKey={(b) => b.period_start}
          empty={t("consumo.seriesEmpty")}
          columns={[
            { key: "start", label: t("consumo.colStart"), nowrap: true, cell: (b) => bucketLabel(b) },
            { key: "req", label: t("consumo.colRequests"), align: "r", cell: (b) => num(f.int(b.requests)) },
            { key: "cred", label: two(t("consumo.colCredits1"), t("consumo.colCredits2")), align: "r", cell: (b) => num(f.credits(b.credits_charged)) },
            { key: "deliv", label: two(t("consumo.colAi"), t("consumo.colDeliveries")), align: "r", cell: (b) => num(f.usd(b.ai_cost_deliveries_usd)) },
            { key: "conv", label: two(t("consumo.colAi"), t("consumo.colConversation")), align: "r", cell: (b) => num(f.usd(b.ai_cost_conversation_usd)) },
            { key: "ia", label: two(t("consumo.colPerCredit1"), t("consumo.colPerCredit2")), align: "r", cell: (b) => num(value("ai_cost_per_credit_brl", b.ai_cost_per_credit_brl)) },
            { key: "margin", label: two(t("consumo.colMargin1"), t("consumo.colMargin2")), align: "r", cell: (b) => num(value("gross_margin", b.gross_margin)) },
            { key: "turn", label: two(t("consumo.colTurn1"), t("consumo.colTurn2")), align: "r", cell: (b) => (b.cost_per_turn_usd === null ? <span className="sa-mut">{dash}</span> : num(f.usd(b.cost_per_turn_usd, 4))) },
          ]}
        />
      </Card>
      <Note label={t("consumo.howTitle")}>
        {t.rich("consumo.howText", {
          b: (chunk) => <b>{chunk}</b>,
          models: (chunk) => <a href="/admin/modelos">{chunk}</a>,
          ref: ref === null ? dash : f.money(ref, "BRL"),
          days: trendDays,
        })}
      </Note>
    </AdminPage>
  );
}
