import { unwrap } from "@hellosquad/contracts";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPage } from "@/components/admin/AdminPage";
import { FilterSearch, FilterSelect } from "@/components/admin/Filters";
import { ApiProblem, Card, DataTable, Metrics, Pager, Status, Tag, type Column } from "@/components/admin/ui";
import { adminRead, type AccountSummary } from "@/lib/admin";
import { adminFormat } from "@/lib/admin-format";
import { codeLabel, hrefWith, one } from "@/lib/admin-labels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.contas");
  return { title: t("title") };
}

type Search = Promise<Record<string, string | string[] | undefined>>;

/** Contas (SA0 `contas.html` → `GET /admin/accounts`): cartões, busca, plano, estado e cursor. */
export default async function AccountsPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const q = one(sp.q);
  const plan = one(sp.plan);
  const statusParam = one(sp.status);
  const status = statusParam === "active" || statusParam === "suspended" || statusParam === "deleted" ? statusParam : undefined;
  const cursor = one(sp.cursor);
  const [t, locale] = await Promise.all([getTranslations("admin"), getLocale()]);
  const f = adminFormat(locale);
  const [accounts, plans] = await Promise.all([
    adminRead((api) => unwrap(api.GET("/admin/accounts", { params: { query: { q, plan, status, cursor, limit: 50 } } })), "/admin/contas"),
    adminRead((api) => unwrap(api.GET("/admin/plans")), "/admin/contas"),
  ]);

  const columns: Column<AccountSummary>[] = [
    {
      key: "name",
      label: t("contas.colName"),
      cell: (a) => (
        <div className="sa-cell-a">
          <span className="sa-biz" aria-hidden="true">
            {a.name.charAt(0).toUpperCase()}
          </span>
          <div className="sa-cell-m">
            <a className="sa-rowlink" href={`/admin/contas/${a.id}`} aria-label={t("contas.openAccount", { name: a.name })}>
              {a.name}
            </a>
            <small>{a.owner_email ?? t("common.dash")}</small>
          </div>
        </div>
      ),
    },
    {
      key: "plan",
      label: t("contas.colPlan"),
      nowrap: true,
      cell: (a) =>
        a.plan ? (
          <span className="sa-tags">
            {a.plan.name}
            {a.plan.provisional ? <Tag kind="sim">{t("common.provisional")}</Tag> : null}
          </span>
        ) : (
          <span className="sa-mut">{t("conta.noPlan")}</span>
        ),
    },
    { key: "credits", label: t("contas.colCredits"), align: "r", nowrap: true, cell: (a) => <span className="sa-num">{f.credits(a.credits_balance)}</span> },
    { key: "since", label: t("contas.colSince"), nowrap: true, cell: (a) => f.date(a.created_at) },
    { key: "members", label: t("contas.colMembers"), align: "r", cell: (a) => <span className="sa-num">{f.int(a.member_count)}</span> },
    { key: "locale", label: t("contas.colLocale"), nowrap: true, cell: (a) => codeLabel(t, "locale", a.locale) },
    {
      key: "status",
      label: t("contas.colStatus"),
      nowrap: true,
      cell: (a) => (
        <Status kind={a.status === "active" ? "done" : a.status === "suspended" ? "pause" : "block"} small title={a.suspension_reason ?? undefined}>
          {codeLabel(t, "accountStatus", a.status)}
        </Status>
      ),
    },
  ];

  const planOptions = [
    { value: "", label: t("common.all") },
    ...(plans.ok ? plans.data.plans.map((p) => ({ value: p.slug, label: p.name })) : []),
  ];
  const statusOptions = [
    { value: "", label: t("common.all") },
    { value: "active", label: codeLabel(t, "accountStatus", "active") },
    { value: "suspended", label: codeLabel(t, "accountStatus", "suspended") },
    { value: "deleted", label: codeLabel(t, "accountStatus", "deleted") },
  ];

  return (
    <AdminPage nav="contas" title={t("contas.title")} desc={t("contas.desc")}>
      {accounts.ok ? (
        <>
          <Metrics
            cols={4}
            items={[
              { label: t("contas.metAccounts"), value: f.int(accounts.data.totals.accounts) },
              { label: t("contas.metPaid"), value: f.int(accounts.data.totals.paid_plans) },
              { label: t("contas.metFree"), value: f.int(accounts.data.totals.free_plans) },
              { label: t("contas.metCredits"), value: f.credits(accounts.data.totals.credits_balance) },
            ]}
          />
          <Card id="contas-lista" title={t("contas.listTitle")} flush>
            <div className="sa-tool" style={{ padding: "0 20px 14px" }}>
              <FilterSearch name="q" label={t("contas.search")} placeholder={t("contas.searchPlaceholder")} />
              <FilterSelect name="plan" title={t("contas.plan")} prefix={t("contas.plan")} options={planOptions} />
              <FilterSelect name="status" title={t("contas.status")} prefix={t("contas.status")} options={statusOptions} right />
            </div>
            <DataTable
              caption={t("contas.listTitle")}
              columns={columns}
              rows={accounts.data.items}
              rowKey={(a) => a.id}
              empty={t("contas.empty")}
            />
          </Card>
          <Pager
            nextHref={accounts.data.next_cursor ? hrefWith("/admin/contas", { q, plan, status, cursor: accounts.data.next_cursor }) : null}
            firstHref={cursor ? hrefWith("/admin/contas", { q, plan, status }) : null}
            nextLabel={t("common.next")}
            firstLabel={t("common.first")}
          />
        </>
      ) : (
        <ApiProblem label={t("common.apiDown")} message={accounts.error.message} />
      )}
    </AdminPage>
  );
}
