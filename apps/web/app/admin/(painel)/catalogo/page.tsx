import { unwrap } from "@hellosquad/contracts";
import { Agent, AGENT_IDS, getAgent, isAgentId } from "@hellosquad/ui";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { CatalogEditDialog } from "@/components/admin/actions/CatalogActions";
import { RecentAudit } from "@/components/admin/actions/RecentAudit";
import { AdminPage } from "@/components/admin/AdminPage";
import { catalogVersion, homologationCounts, integrationTags } from "@/components/admin/catalog";
import { AgentLabel, ApiProblem, Card, DataTable, LockedCheck, Metrics, Note, Status, Tag, type StatusKind } from "@/components/admin/ui";
import { adminRead, type CatalogItem } from "@/lib/admin";
import { adminFormat } from "@/lib/admin-format";
import { codeLabel, hrefWith, one } from "@/lib/admin-labels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.catalogo");
  return { title: t("title") };
}

const HOMOLOGATION_KIND: Record<string, StatusKind> = {
  homologated: "done",
  in_homologation: "prog",
  awaiting_engine: "pause",
  awaiting_integration: "pause",
  not_started: "draft",
};

/** Ações do Super Admin no catálogo (a auditoria do pé da página mostra só estas). */
const CATALOG_ACTIONS = ["admin.catalog_price_versioned", "admin.catalog_homologation_changed", "admin.catalog_for_sale_changed"] as const;

type Search = Promise<Record<string, string | string[] | undefined>>;

/**
 * Catálogo (SA0 `catalogo.html` → `GET /admin/catalog`): as 46 deliveries, um cartão por agente. Profundidade inferida
 * marcada, preço provisório marcado, travas "preço aprovado comercialmente" e "à venda" na tabela só como leitura; a
 * edição (SA6b) é por delivery, em "Editar": preço novo, homologação e "à venda", cada um com motivo e auditoria.
 * Como o SA0 (SA7b): versão e "Ver histórico" no topo, linha de apoio nos números, filtro por agente em chips com a
 * contagem, cabeçalho do agente com deliveries, homologação e "Abrir o agente", integrações em etiquetas.
 */
export default async function CatalogPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const agentParam = one(sp.agente);
  const agent = agentParam && isAgentId(agentParam) ? agentParam : undefined;
  const [t, areas, locale] = await Promise.all([getTranslations("admin"), getTranslations("common"), getLocale()]);
  const f = adminFormat(locale);
  const dash = t("common.dash");
  // O catálogo inteiro (46 linhas): os chips contam por agente e os números do topo não dependem do filtro.
  const result = await adminRead((api) => unwrap(api.GET("/admin/catalog")), "/admin/catalogo");
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
    {
      key: "integ",
      label: t("catalogo.colIntegrations"),
      cell: (d: CatalogItem) => {
        const tags = integrationTags(d.integrations);
        if (!tags.length) return <small className="sa-mut">{d.integrations ?? dash}</small>;
        return (
          <div className="sa-chips sa-integ" title={d.integrations ?? undefined}>
            {tags.map((tag) => (
              <span key={tag} className="sa-chip">
                {t(`catalogo.integ.${tag}`)}
              </span>
            ))}
          </div>
        );
      },
    },
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
    {
      key: "edit",
      label: t("acoes.catalog.col"),
      nowrap: true,
      cell: (d: CatalogItem) => (
        <CatalogEditDialog deliveryType={d.delivery_type} name={d.name} price={d.price} homologation={d.homologation_status} forSale={d.for_sale} />
      ),
    },
  ];

  const items = result.ok ? result.data.items : [];
  const groups = AGENT_IDS.map((id) => ({ id, items: items.filter((d) => d.agent_id === id) }));
  const byAgent = groups.filter((g) => g.items.length && (!agent || g.id === agent));
  const count = (pred: (d: CatalogItem) => boolean) => items.filter(pred).length;
  const forSale = count((d) => d.for_sale);
  const approved = count((d) => Boolean(d.price?.approved_commercially));
  const engine = count((d) => d.homologation_status === "awaiting_engine");
  const integration = count((d) => d.homologation_status === "awaiting_integration");
  const chips = [
    { id: undefined, label: t("common.all"), n: items.length },
    ...groups.map((g) => ({ id: g.id, label: getAgent(g.id).name, n: g.items.length })),
  ];

  return (
    <AdminPage
      audited
      nav="catalogo"
      title={t("catalogo.title")}
      desc={t("catalogo.desc")}
      actions={
        result.ok ? (
          <>
            <span className="sa-chip is-mono" title={t("catalogo.versionTitle")}>
              {t("catalogo.version", { n: catalogVersion(items) })}
            </span>
            <Link className="hs-btn hs-btn--ghost hs-btn--s" href={hrefWith("/admin/auditoria", { quem: "platform_admin", tipo: "configuration" })}>
              {t("catalogo.history")}
            </Link>
          </>
        ) : undefined
      }
    >
      {result.ok ? (
        <>
          <Metrics
            items={[
              {
                label: t("catalogo.metDeliveries"),
                value: f.int(items.length),
                detail: t("catalogo.metDeliveriesDetail", { agents: groups.filter((g) => g.items.length).length }),
              },
              {
                label: t("catalogo.metForSale"),
                value: f.int(forSale),
                detail: forSale ? t("catalogo.metForSaleYes") : t("catalogo.metForSaleNone"),
              },
              {
                label: t("catalogo.metApproved"),
                value: f.int(approved),
                unit: t("catalogo.metOf", { total: f.int(items.length) }),
                detail: approved ? t("catalogo.metApprovedYes") : t("catalogo.metApprovedNone"),
              },
              {
                label: t("catalogo.metHomologated"),
                value: f.int(count((d) => d.homologation_status === "homologated")),
                detail: t("catalogo.metHomologatedDetail", { n: count((d) => d.homologation_status === "in_homologation") }),
              },
              {
                label: t("catalogo.metWaiting"),
                value: f.int(engine + integration),
                detail: t("catalogo.metWaitingDetail", { engine, integration }),
              },
            ]}
          />
          <Note kind="draft" label={t("common.provisional")}>
            {items.some((d) => d.for_sale || d.price?.approved_commercially) ? t("acoes.catalog.noteLive") : t("catalogo.note")}
          </Note>
          <div className="sa-tool" style={{ margin: "16px 0" }}>
            <nav className="sa-tabs is-line" aria-label={t("catalogo.filterAgent")}>
              {chips.map((c) => (
                <Link
                  key={c.id ?? "todos"}
                  className="sa-tab"
                  href={hrefWith("/admin/catalogo", { agente: c.id })}
                  aria-current={agent === c.id ? "page" : undefined}
                >
                  {c.id ? <Agent agent={c.id} size={18} /> : null}
                  {c.label} <span className="sa-tab-n">{f.int(c.n)}</span>
                </Link>
              ))}
            </nav>
            <span className="sa-grow" />
            <span className="sa-mut sa-tool-hint">
              {t("catalogo.creditsHint")} <Tag kind="sim">{t("common.provisional")}</Tag>
            </span>
          </div>
          {byAgent.length ? (
            byAgent.map((g) => (
              <Card
                key={g.id}
                id={`cat-${g.id}`}
                title={<AgentLabel agent={g.id} name={getAgent(g.id).name} />}
                sub={`${areas(`areas.${g.id}`)} · ${t("catalogo.deliveriesCount", { n: g.items.length })}`}
                actions={
                  <>
                    <small className="sa-mut sa-card-sum">
                      {homologationCounts(g.items)
                        .map((c) => t(`catalogo.homolSummary.${c.status}`, { n: c.n }))
                        .join(" · ")}
                    </small>
                    <Link className="hs-btn hs-btn--ghost hs-btn--s" href={`/admin/squad/${g.id}`}>
                      {t("catalogo.openAgent")}
                    </Link>
                  </>
                }
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
          <RecentAudit
            id="cat-auditoria"
            title={t("acoes.catalog.recent")}
            sub={t("conta.recentSub")}
            empty={t("acoes.catalog.recentEmpty")}
            category="configuration"
            actions={CATALOG_ACTIONS}
          />
        </>
      ) : (
        <ApiProblem label={t("common.apiDown")} message={result.error.message} />
      )}
    </AdminPage>
  );
}
