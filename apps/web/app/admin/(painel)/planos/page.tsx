import { unwrap } from "@hellosquad/contracts";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AdminPage } from "@/components/admin/AdminPage";
import { ApiProblem, Card, LockedCheck, Note, SoonButton, Status, Tag } from "@/components/admin/ui";
import { adminRead, type PlansResponse } from "@/lib/admin";
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
    </Card>
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

/**
 * Planos e recargas (SA0 `planos.html` → `GET /admin/plans`): versões, créditos por ciclo, validade, preço e a trava
 * "preço aprovado comercialmente". Tudo provisório; editar fica desenhado e desabilitado.
 */
export default async function PlansPage() {
  const [t, locale] = await Promise.all([getTranslations("admin"), getLocale()]);
  const f = adminFormat(locale);
  const result = await adminRead((api) => unwrap(api.GET("/admin/plans")), "/admin/planos");
  const validity = (days: number | null) => (days ? t("planos.validityDays", { n: days }) : t("planos.noValidity"));

  return (
    <AdminPage
      nav="planos"
      title={t("planos.title")}
      desc={t("planos.desc")}
      actions={<SoonButton label={t("planos.edit")} reason={t("common.editLater")} />}
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
        </>
      ) : (
        <ApiProblem label={t("common.apiDown")} message={result.error.message} />
      )}
    </AdminPage>
  );
}
