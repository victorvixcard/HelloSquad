import { unwrap } from "@hellosquad/contracts";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { OfferEditDialog } from "@/components/admin/actions/OfferActions";
import { AdminPage } from "@/components/admin/AdminPage";
import { ApiProblem, Card, DataTable, LockedCheck, Note, Status, Tag } from "@/components/admin/ui";
import { adminRead, type AuditItem, type PlansResponse } from "@/lib/admin";
import { adminFormat, type AdminFormat } from "@/lib/admin-format";
import { codeLabel } from "@/lib/admin-labels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.planos");
  return { title: t("title") };
}

type Plan = PlansResponse["plans"][number];
type Topup = PlansResponse["topups"][number];
type T = Awaited<ReturnType<typeof getTranslations<"admin">>>;

/** Cartão de oferta do SA0 (`pl-oferta`): ciclo, créditos, validade, preço provisório e as duas travas, só leitura. */
function Offer(props: {
  t: T;
  id: string;
  name: string;
  forSale: boolean;
  version: number;
  rows: [string, ReactNode][];
  approved: boolean;
  edit?: ReactNode;
}) {
  const { t } = props;
  return (
    <Card
      id={props.id}
      title={props.name}
      sub={t("planos.version", { n: props.version })}
      className="pl-oferta"
      actions={
        props.forSale ? (
          <Status kind="done" small>
            {t("planos.forSale")}
          </Status>
        ) : (
          <Status kind="pause" small title={t("catalogo.locked")}>
            {t("planos.offSale")}
          </Status>
        )
      }
    >
      <dl className="sa-kv">
        {props.rows.map(([label, value]) => (
          <div key={label} style={{ display: "contents" }}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="sa-checks" style={{ marginTop: 16 }}>
        <span className="sa-tags">
          <LockedCheck checked={props.approved} label={t("planos.approved")} title={t("common.readOnlyAction")} />
          {t("planos.approved")}
        </span>
        <span className="sa-tags">
          <LockedCheck checked={props.forSale} label={t("planos.forSale")} title={props.approved ? t("common.readOnlyAction") : t("catalogo.locked")} />
          {t("planos.forSale")}
        </span>
      </div>
      {props.edit ? <div className="hl-acts">{props.edit}</div> : null}
    </Card>
  );
}

/** Versão gravada pelo painel, como a auditoria guardou (`admin.plan_versioned` / `admin.topup_versioned`). */
function versionCell(t: T, e: AuditItem, current: Map<string, number>) {
  const p = e.payload as Record<string, unknown>;
  const slug = String(p.plan ?? p.topup ?? "");
  const version = typeof p.version === "number" ? p.version : null;
  return (
    <span className="sa-tags">
      <span className="sa-code">{slug}</span>
      {version !== null ? <span className="sa-num">{t("planos.version", { n: version })}</span> : null}
      {version !== null && current.get(slug) === version ? <Tag kind="ok">{t("acoes.offer.current")}</Tag> : null}
    </span>
  );
}

function price(t: T, f: AdminFormat, amount: string | null, currency: string | null, provisional: boolean | null) {
  if (!amount || !currency) return t("planos.noPrice");
  return (
    <span className="sa-tags">
      <span className="sa-num">{f.money(amount, currency)}</span>
      {provisional ? <Tag kind="sim">{t("common.provisional")}</Tag> : null}
    </span>
  );
}

function credits(t: T, f: AdminFormat, value: string, provisional: boolean) {
  return (
    <span className="sa-tags">
      <span className="sa-num">{f.credits(value)}</span>
      {provisional ? <Tag kind="sim">{t("common.provisional")}</Tag> : null}
    </span>
  );
}

const OFFER_ACTIONS = ["admin.plan_versioned", "admin.topup_versioned"] as const;

/**
 * Planos e recargas (SA0 `planos.html` → `GET /admin/plans`): versões, créditos por ciclo, validade, preço e a trava
 * "preço aprovado comercialmente". Editar (SA6b) grava uma versão nova com motivo; as versões gravadas pelo painel
 * ficam no histórico (lido da Auditoria), só leitura.
 */
export default async function PlansPage() {
  const [t, locale] = await Promise.all([getTranslations("admin"), getLocale()]);
  const f = adminFormat(locale);
  const [result, audit] = await Promise.all([
    adminRead((api) => unwrap(api.GET("/admin/plans")), "/admin/planos"),
    adminRead((api) => unwrap(api.GET("/admin/audit", { params: { query: { actor: "platform_admin", category: "configuration", limit: 200 } } }))),
  ]);
  const history = audit.ok ? audit.data.items.filter((e) => (OFFER_ACTIONS as readonly string[]).includes(e.action)) : [];
  const currentVersion = new Map(result.ok ? result.data.plans.map((p) => [p.slug, p.version] as const) : []);
  const dash = t("common.dash");
  const money = (e: AuditItem) => {
    const p = e.payload as Record<string, unknown>;
    return p.amount !== null && p.amount !== undefined && typeof p.currency === "string" ? f.money(String(p.amount), p.currency) : dash;
  };
  const yes = (v: unknown) => (v === true ? t("common.yes") : t("common.no"));
  const validity = (days: number | null) => (days ? t("planos.validityDays", { n: days }) : t("planos.noValidity"));

  return (
    <AdminPage
      nav="planos"
      title={t("planos.title")}
      desc={t("planos.desc")}
    >
      {result.ok ? (
        <>
          <Note kind="draft" label={t("common.provisional")}>
            {t("planos.lockNote")} {t("planos.missingFields")}
          </Note>
          <div className="sa-sec-t" style={{ marginTop: 22 }}>
            <h2>{t("planos.plans")}</h2>
          </div>
          {result.data.plans.length ? (
            <div className="sa-row c3">
              {result.data.plans.map((p: Plan) => (
                <Offer
                  key={p.id}
                  t={t}
                  id={`plano-${p.slug}`}
                  name={p.name}
                  forSale={p.for_sale}
                  version={p.version}
                  approved={Boolean(p.price_approved_commercially ?? p.approved_commercially)}
                  edit={
                    <OfferEditDialog
                      kind="plan"
                      slug={p.slug}
                      name={p.name}
                      version={p.version}
                      current={{
                        credits: p.credits,
                        cycle: p.cycle,
                        validityDays: p.validity_days,
                        amount: p.price_amount,
                        currency: p.price_currency,
                        provisional: p.provisional,
                        approved: p.approved_commercially,
                        forSale: p.for_sale,
                      }}
                    />
                  }
                  rows={[
                    [t("planos.cycle"), codeLabel(t, "cycle", p.cycle)],
                    [t("planos.credits"), credits(t, f, p.credits, p.provisional)],
                    [t("planos.validity"), validity(p.validity_days)],
                    [t("planos.price"), price(t, f, p.price_amount, p.price_currency, p.price_provisional)],
                  ]}
                />
              ))}
            </div>
          ) : (
            <p className="sa-mut">{t("planos.empty")}</p>
          )}
          <div className="sa-sec-t" style={{ marginTop: 22 }}>
            <h2>{t("planos.topups")}</h2>
          </div>
          {result.data.topups.length ? (
            <div className="sa-row c3">
              {result.data.topups.map((r: Topup) => (
                <Offer
                  key={r.id}
                  t={t}
                  id={`recarga-${r.slug}`}
                  name={r.name}
                  forSale={r.for_sale}
                  version={r.version}
                  approved={r.approved_commercially}
                  edit={
                    <OfferEditDialog
                      kind="topup"
                      slug={r.slug}
                      name={r.name}
                      version={r.version}
                      current={{
                        credits: r.credits,
                        validityDays: r.validity_days,
                        amount: r.amount,
                        currency: r.currency,
                        provisional: r.provisional,
                        approved: r.approved_commercially,
                        forSale: r.for_sale,
                      }}
                    />
                  }
                  rows={[
                    [t("planos.topupCredits"), credits(t, f, r.credits, r.provisional)],
                    [t("planos.validity"), validity(r.validity_days)],
                    [t("planos.price"), price(t, f, r.amount, r.currency, r.provisional)],
                  ]}
                />
              ))}
            </div>
          ) : (
            <p className="sa-mut">{t("planos.topupsEmpty")}</p>
          )}
          <div style={{ height: 22 }} />
          <Card id="planos-versoes" title={t("acoes.offer.history")} sub={t("acoes.offer.historySub")} flush>
            {audit.ok ? (
              <DataTable<AuditItem>
                caption={t("acoes.offer.history")}
                rows={history}
                rowKey={(e) => e.id}
                empty={t("acoes.offer.historyEmpty")}
                columns={[
                  { key: "when", label: t("conta.colWhen"), nowrap: true, cell: (e) => f.dateTime(e.created_at) },
                  { key: "offer", label: t("acoes.offer.colOffer"), nowrap: true, cell: (e) => versionCell(t, e, currentVersion) },
                  {
                    key: "credits",
                    label: t("planos.credits"),
                    align: "r",
                    nowrap: true,
                    cell: (e) => <span className="sa-num">{f.credits(String((e.payload as Record<string, unknown>).credits ?? 0))}</span>,
                  },
                  { key: "price", label: t("planos.price"), nowrap: true, cell: (e) => money(e) },
                  { key: "prov", label: t("common.provisional"), nowrap: true, cell: (e) => yes((e.payload as Record<string, unknown>).provisional) },
                  { key: "appr", label: t("planos.approved"), nowrap: true, cell: (e) => yes((e.payload as Record<string, unknown>).approved_commercially) },
                  { key: "sale", label: t("planos.forSale"), nowrap: true, cell: (e) => yes((e.payload as Record<string, unknown>).for_sale) },
                  { key: "reason", label: t("conta.colReason"), cell: (e) => String((e.payload as Record<string, unknown>).reason ?? dash) },
                  { key: "who", label: t("conta.colAdmin"), nowrap: true, cell: (e) => e.actor_email ?? dash },
                ]}
              />
            ) : (
              <p className="sa-mut hl-pad">{audit.error.message}</p>
            )}
          </Card>
        </>
      ) : (
        <ApiProblem label={t("common.apiDown")} message={result.error.message} />
      )}
    </AdminPage>
  );
}
