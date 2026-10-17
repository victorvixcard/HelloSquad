import { unwrap } from "@hellosquad/contracts";
import { getAgent, isAgentId } from "@hellosquad/ui";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AgentLabel, ApiProblem, Card, DataTable, Metrics, Note, SoonButton, Tag } from "@/components/admin/ui";
import { adminRead, type ConsumptionResponse, type ModelsOverview } from "@/lib/admin";
import { adminFormat } from "@/lib/admin-format";
import { codeLabel } from "@/lib/admin-labels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.modelos");
  return { title: t("title") };
}

type CostRow = ModelsOverview["costs_by_model"][number];
type Rule = ModelsOverview["rules"][number];
type Price = ModelsOverview["prices"][number];
type ClientRow = ConsumptionResponse["items"][number];

/**
 * Modelos e custos (SA0 `modelos.html` → `GET /admin/models` e, para o custo por cliente, `GET /admin/consumption`),
 * só leitura: Custos (chamadas e custo do período, por modelo e por cliente), Regras por tarefa (modelo e esforço por
 * etapa) e Preços e câmbio (provisórios, com "conferido em"). Editar como versão nova fica desenhado e desabilitado.
 */
export default async function ModelsPage() {
  const [t, locale] = await Promise.all([getTranslations("admin"), getLocale()]);
  const f = adminFormat(locale);
  const dash = t("common.dash");
  const [models, consumption] = await Promise.all([
    adminRead((api) => unwrap(api.GET("/admin/models")), "/admin/modelos"),
    adminRead((api) => unwrap(api.GET("/admin/consumption")), "/admin/modelos"),
  ]);
  const edit = <SoonButton label={t("modelos.edit")} reason={t("common.editLater")} />;

  if (!models.ok) {
    return (
      <AdminPage nav="modelos" title={t("modelos.title")} desc={t("modelos.desc")}>
        <ApiProblem label={t("common.apiDown")} message={models.error.message} />
      </AdminPage>
    );
  }
  const m = models.data;
  const fx = m.exchange_rate;
  const usdBrl = fx ? Number(fx.usd_brl) : null;
  const costs = m.costs_by_model;
  const sum = (k: "calls" | "input_tokens" | "cache_read_tokens" | "output_tokens") => costs.reduce((a, r) => a + r[k], 0);
  const totalUsd = costs.reduce((a, r) => a + Number(r.cost_usd), 0);
  const clients = consumption.ok ? consumption.data.items : [];
  const mtok = (v: string) => <span className="sa-num">{f.usd(v, 2)}</span>;

  const costsPanel = (
    <>
      <p className="sa-mut" style={{ margin: "0 0 12px" }}>
        {t("modelos.period", { since: f.date(m.since), until: f.date(m.until) })}
      </p>
      <Metrics
        items={[
          { label: t("modelos.metCalls"), value: f.int(sum("calls")) },
          {
            label: t("modelos.metCost"),
            value: f.usd(totalUsd, 2),
            detail: usdBrl !== null ? f.money(totalUsd * usdBrl, "BRL") : undefined,
          },
          { label: t("modelos.metInput"), value: f.tokens(sum("input_tokens")) },
          { label: t("modelos.metCache"), value: f.tokens(sum("cache_read_tokens")) },
          { label: t("modelos.metOutput"), value: f.tokens(sum("output_tokens")) },
        ]}
      />
      <Card id="mc-modelo" title={t("modelos.byModel")} flush>
        <DataTable<CostRow>
          caption={t("modelos.byModel")}
          rows={costs}
          rowKey={(r) => r.model}
          empty={t("modelos.costsEmpty")}
          columns={[
            { key: "model", label: t("modelos.colModel"), nowrap: true, cell: (r) => <span className="sa-code">{r.model}</span> },
            { key: "calls", label: t("modelos.colCalls"), align: "r", cell: (r) => <span className="sa-num">{f.int(r.calls)}</span> },
            { key: "in", label: t("modelos.colInput"), align: "r", cell: (r) => <span className="sa-num">{f.tokens(r.input_tokens)}</span> },
            { key: "cache", label: t("modelos.colCache"), align: "r", cell: (r) => <span className="sa-num">{f.tokens(r.cache_read_tokens)}</span> },
            { key: "out", label: t("modelos.colOutput"), align: "r", cell: (r) => <span className="sa-num">{f.tokens(r.output_tokens)}</span> },
            { key: "usd", label: t("modelos.colUsd"), align: "r", cell: (r) => <span className="sa-num">{f.usd(r.cost_usd, 4)}</span> },
          ]}
        />
      </Card>
      <Card id="mc-cliente" title={t("modelos.byClient")} flush>
        <DataTable<ClientRow>
          caption={t("modelos.byClient")}
          rows={clients}
          rowKey={(r) => r.workspace_id}
          empty={t("modelos.costsEmpty")}
          columns={[
            {
              key: "account",
              label: t("modelos.colAccount"),
              cell: (r) => (
                <a className="sa-rowlink" href={`/admin/contas/${r.workspace_id}`}>
                  {r.workspace_name}
                </a>
              ),
            },
            { key: "calls", label: t("modelos.colCalls"), align: "r", cell: (r) => <span className="sa-num">{f.int(r.llm_calls)}</span> },
            { key: "in", label: t("modelos.colInput"), align: "r", cell: (r) => <span className="sa-num">{f.tokens(r.input_tokens)}</span> },
            { key: "cache", label: t("modelos.colCache"), align: "r", cell: (r) => <span className="sa-num">{f.tokens(r.cache_read_tokens)}</span> },
            { key: "out", label: t("modelos.colOutput"), align: "r", cell: (r) => <span className="sa-num">{f.tokens(r.output_tokens)}</span> },
            { key: "usd", label: t("modelos.colUsd"), align: "r", cell: (r) => <span className="sa-num">{f.usd(r.ai_cost_usd, 4)}</span> },
            { key: "brl", label: t("modelos.colBrl"), align: "r", cell: (r) => (r.ai_cost_brl ? <span className="sa-num">{f.money(r.ai_cost_brl, "BRL")}</span> : dash) },
          ]}
        />
      </Card>
      <Note label={t("modelos.howTitle")}>{t("modelos.how")}</Note>
    </>
  );

  const rulesPanel = (
    <Card id="mc-regras" title={t("modelos.rules")} actions={edit} flush>
      <DataTable<Rule>
        caption={t("modelos.rules")}
        rows={m.rules}
        rowKey={(r) => `${r.agent_id}-${r.task}`}
        empty={t("common.empty")}
        columns={[
          {
            key: "agent",
            label: t("modelos.colAgent"),
            nowrap: true,
            cell: (r) => (isAgentId(r.agent_id) ? <AgentLabel agent={r.agent_id} name={getAgent(r.agent_id).name} /> : r.agent_id),
          },
          { key: "task", label: t("modelos.colTask"), nowrap: true, cell: (r) => codeLabel(t, "task", r.task) },
          {
            key: "steps",
            label: t("modelos.colSteps"),
            cell: (r) => (
              <span className="sa-chips">
                {r.steps.map((s) => (
                  <span key={s} className="sa-chip is-mono">
                    {s}
                  </span>
                ))}
              </span>
            ),
          },
          { key: "model", label: t("modelos.colModel"), nowrap: true, cell: (r) => <span className="sa-code">{r.model}</span> },
          { key: "effort", label: t("modelos.colEffort"), nowrap: true, cell: (r) => (r.effort ? codeLabel(t, "effort", r.effort) : dash) },
          {
            key: "thinking",
            label: t("modelos.colThinking"),
            nowrap: true,
            cell: (r) =>
              r.thinking === "budget" && r.thinking_budget !== null
                ? t("codes.thinking.budget", { budget: f.int(r.thinking_budget) })
                : t.has(`codes.thinking.${r.thinking}` as never)
                  ? t(`codes.thinking.${r.thinking}` as never)
                  : r.thinking,
          },
          { key: "source", label: t("modelos.colSource"), cell: (r) => <small className="sa-mut sa-code">{r.source}</small> },
        ]}
      />
    </Card>
  );

  const pricesPanel = (
    <>
      <Card
        id="mc-precos"
        title={t("modelos.prices")}
        sub={t("common.perMtok")}
        actions={
          <span className="sa-tags">
            {m.prices[0] ? <Tag kind="sim">{t("common.checkedAt", { date: f.date(m.prices[0].checked_at) })}</Tag> : null}
            {edit}
          </span>
        }
        flush
      >
        <DataTable<Price>
          caption={`${t("modelos.prices")} · ${t("common.perMtok")}`}
          rows={m.prices}
          rowKey={(p) => p.model}
          empty={t("common.empty")}
          columns={[
            {
              key: "model",
              label: t("modelos.colModel"),
              cell: (p) => (
                <div className="sa-cell-m">
                  <b>{p.display_name}</b>
                  <small className="sa-code">{p.model}</small>
                </div>
              ),
            },
            { key: "in", label: t("modelos.colPriceIn"), align: "r", nowrap: true, cell: (p) => mtok(p.input_usd_per_mtok) },
            { key: "out", label: t("modelos.colPriceOut"), align: "r", nowrap: true, cell: (p) => mtok(p.output_usd_per_mtok) },
            { key: "cr", label: t("modelos.colPriceCacheRead"), align: "r", nowrap: true, cell: (p) => mtok(p.cache_read_usd_per_mtok) },
            { key: "cw", label: t("modelos.colPriceCacheWrite"), align: "r", nowrap: true, cell: (p) => mtok(p.cache_write_usd_per_mtok) },
            {
              key: "checked",
              label: t("modelos.colChecked"),
              nowrap: true,
              cell: (p) => (
                <span className="sa-tags">
                  {f.date(p.checked_at)}
                  {p.provisional ? <Tag kind="sim">{t("common.provisional")}</Tag> : null}
                </span>
              ),
            },
            { key: "source", label: t("common.source"), cell: (p) => <small className="sa-mut">{p.source}</small> },
          ]}
        />
      </Card>
      <Card id="mc-cambio" title={t("modelos.fx")} actions={<Tag kind="sim">{t("common.example")}</Tag>}>
        {fx ? (
          <dl className="sa-kv">
            <dt>{t("modelos.fx")}</dt>
            <dd className="sa-num">{t("modelos.fxValue", { brl: f.money(fx.usd_brl, "BRL") })}</dd>
            <dt>{t("modelos.colChecked")}</dt>
            <dd>{t("modelos.fxDate", { date: f.date(fx.fx_date) })}</dd>
            <dt>{t("common.source")}</dt>
            <dd>{fx.fx_source}</dd>
          </dl>
        ) : (
          <p className="sa-mut">{dash}</p>
        )}
      </Card>
    </>
  );

  return (
    <AdminPage nav="modelos" title={t("modelos.title")} desc={t("modelos.desc")}>
      <AdminTabs
        idPrefix="mc"
        label={t("modelos.tabsLabel")}
        tabs={[
          { id: "custos", label: t("modelos.tabCosts"), panel: costsPanel },
          { id: "regras", label: t("modelos.tabRules"), panel: rulesPanel },
          { id: "precos", label: t("modelos.tabPrices"), panel: pricesPanel },
        ]}
      />
    </AdminPage>
  );
}
