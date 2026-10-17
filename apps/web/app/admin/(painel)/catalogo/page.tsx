import { unwrap } from "@hellosquad/contracts";
import { AGENT_IDS, getAgent, isAgentId, type AgentId } from "@hellosquad/ui";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPage } from "@/components/admin/AdminPage";
import { FilterSelect } from "@/components/admin/Filters";
import { AgentLabel, ApiProblem, Card, DataTable, LockedCheck, Metrics, Note, SoonButton, Status, Tag, type StatusKind } from "@/components/admin/ui";
import { adminRead, type CatalogItem } from "@/lib/admin";
import { adminFormat } from "@/lib/admin-format";
import { codeLabel, one } from "@/lib/admin-labels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.catalogo");
  return { title: t("title") };
}

const HOMOLOGATION_KIND: Record<string, StatusKind> = {
  homologated: "done",
  in_homologation: "prog",
  awaiting_engine: "pause",
  not_started: "draft",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

/**
 * Catálogo (SA0 `catalogo.html` → `GET /admin/catalog`): as 46 deliveries, um cartão por agente. Profundidade inferida
 * marcada, preço provisório marcado, travas "preço aprovado comercialmente" e "à venda" só de leitura.
 */
export default async function CatalogPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const agentParam = one(sp.agente);
  const agent = agentParam && isAgentId(agentParam) ? agentParam : undefined;
  const [t, areas, locale] = await Promise.all([getTranslations("admin"), getTranslations("common"), getLocale()]);
  const f = adminFormat(locale);
  const dash = t("common.dash");
  const result = await adminRead((api) => unwrap(api.GET("/admin/catalog", { params: { query: { agent_id: agent } } })), "/admin/catalogo");
  const locked = t("catalogo.locked");

  const columns = [
    { key: "id", label: t("catalogo.colId"), nowrap: true, width: 64, cell: (d: CatalogItem) => <span className="sa-code">{d.delivery_type}</span> },
    {
      key: "name",
      label: t("catalogo.colName"),
      cell: (d: CatalogItem) => (
        <div className="sa-cell-m">
          <b>{d.name}</b>
          <small>{d.result}</small>
        </div>
      ),
    },
    {
      key: "depth",
      label: t("catalogo.colDepth"),
      nowrap: true,
      cell: (d: CatalogItem) => (
        <span className="sa-tags">
          <Tag kind="auto">{codeLabel(t, "depth", d.depth)}</Tag>
          {d.depth_source === "inferred" ? (
            <Tag kind="sim" title={t("common.inferredTitle")}>
              {t("common.inferred")}
            </Tag>
          ) : null}
        </span>
      ),
    },
    { key: "integ", label: t("catalogo.colIntegrations"), cell: (d: CatalogItem) => <small className="sa-mut">{d.integrations ?? dash}</small> },
    {
      key: "homol",
      label: t("catalogo.colHomologation"),
      nowrap: true,
      cell: (d: CatalogItem) => (
        <Status kind={HOMOLOGATION_KIND[d.homologation_status] ?? "draft"} small>
          {codeLabel(t, "homologation", d.homologation_status)}
        </Status>
      ),
    },
    {
      key: "credits",
      label: t("catalogo.colCredits"),
      align: "r" as const,
      nowrap: true,
      cell: (d: CatalogItem) =>
        d.price ? (
          <span className="sa-tags">
            <span className="sa-num">{f.credits(d.price.credits)}</span>
            {d.price.provisional ? <Tag kind="sim">{t("common.provisional")}</Tag> : null}
          </span>
        ) : (
          dash
        ),
    },
    {
      key: "approved",
      label: t("catalogo.colApproved"),
      align: "c" as const,
      cell: (d: CatalogItem) => (
        <LockedCheck checked={Boolean(d.price?.approved_commercially)} label={t("catalogo.approvedLabel", { name: d.name })} title={t("common.readOnlyAction")} />
      ),
    },
    {
      key: "sale",
      label: t("catalogo.colForSale"),
      align: "c" as const,
      cell: (d: CatalogItem) => (
        <LockedCheck checked={d.for_sale} label={t("catalogo.forSaleLabel", { name: d.name })} title={d.price?.approved_commercially ? t("common.readOnlyAction") : locked} />
      ),
    },
  ];

  const items = result.ok ? result.data.items : [];
  const byAgent = AGENT_IDS.map((id) => ({ id, items: items.filter((d) => d.agent_id === id) })).filter((g) => g.items.length);
  const options = [
    { value: "", label: t("catalogo.allAgents") },
    ...AGENT_IDS.map((id) => ({ value: id, label: getAgent(id).name, agent: id as AgentId })),
  ];

  return (
    <AdminPage
      nav="catalogo"
      title={t("catalogo.title")}
      desc={t("catalogo.desc")}
      actions={<SoonButton label={t("catalogo.edit")} reason={t("common.editLater")} />}
    >
      {result.ok ? (
        <>
          <Metrics
            items={[
              { label: t("catalogo.metDeliveries"), value: f.int(items.length) },
              { label: t("catalogo.metForSale"), value: f.int(items.filter((d) => d.for_sale).length) },
              { label: t("catalogo.metApproved"), value: f.int(items.filter((d) => d.price?.approved_commercially).length) },
              { label: t("catalogo.metHomologated"), value: f.int(items.filter((d) => d.homologation_status === "homologated").length) },
              { label: t("catalogo.metWaiting"), value: f.int(items.filter((d) => d.homologation_status === "awaiting_engine").length) },
            ]}
          />
          <Note kind="draft" label={t("common.provisional")}>
            {t("catalogo.note")}
          </Note>
          <div className="sa-tool" style={{ margin: "16px 0" }}>
            <FilterSelect name="agente" title={t("catalogo.filterAgent")} options={options} />
          </div>
          {byAgent.length ? (
            byAgent.map((g) => (
              <Card
                key={g.id}
                id={`cat-${g.id}`}
                title={<AgentLabel agent={g.id} name={getAgent(g.id).name} />}
                sub={areas(`areas.${g.id}`)}
                flush
              >
                <DataTable<CatalogItem>
                  caption={`${t("catalogo.title")} · ${getAgent(g.id).name}`}
                  columns={columns}
                  rows={g.items}
                  rowKey={(d) => d.delivery_type}
                  empty={t("catalogo.empty")}
                />
              </Card>
            ))
          ) : (
            <Card flush>
              <p className="sa-tbl-empty">{t("catalogo.empty")}</p>
            </Card>
          )}
        </>
      ) : (
        <ApiProblem label={t("common.apiDown")} message={result.error.message} />
      )}
    </AdminPage>
  );
}
