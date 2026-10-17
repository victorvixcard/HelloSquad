import { unwrap } from "@hellosquad/contracts";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPage } from "@/components/admin/AdminPage";
import { ApiProblem, Card, DataTable, Empty, Metrics, Note, SoonButton, Status, Tag } from "@/components/admin/ui";
import { adminRead, type AccountDetail } from "@/lib/admin";
import { adminFormat } from "@/lib/admin-format";
import { codeLabel } from "@/lib/admin-labels";

type Params = Promise<{ id: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.contas");
  return { title: t("title") };
}

type Member = AccountDetail["members"][number];
type Entry = AccountDetail["ledger"][number];
type Access = AccountDetail["support_accesses"][number];

/**
 * Detalhe da conta (SA0 `conta.html` → `GET /admin/accounts/{id}`): plano, saldo, membros, idioma, desde, extrato,
 * acessos do suporte, uso e assinatura. Abrir grava `support.account_viewed` na auditoria (a API faz). As ações do
 * suporte ficam desenhadas e desabilitadas até a SA6; cidade, PF/PJ e "suspensa" não existem no banco e não aparecem.
 */
export default async function AccountPage({ params }: { params: Params }) {
  const { id } = await params;
  const [t, locale] = await Promise.all([getTranslations("admin"), getLocale()]);
  const f = adminFormat(locale);
  const dash = t("common.dash");
  const result = await adminRead(
    (api) => unwrap(api.GET("/admin/accounts/{workspace_id}", { params: { path: { workspace_id: id } } })),
    `/admin/contas/${id}`,
  );
  const crumbs = [{ label: t("conta.crumb"), href: "/admin/contas" }];

  if (!result.ok) {
    const missing = result.error.status === 404 || result.error.status === 422;
    return (
      <AdminPage nav="contas" title={missing ? t("conta.notFound") : t("conta.crumb")} crumbs={crumbs}>
        {missing ? (
          <Empty title={t("conta.notFound")} agent="nexo" expression="serio" actions={<a className="hs-btn hs-btn--soft hs-btn--s" href="/admin/contas"><span className="hs-lbl">{t("conta.backToList")}</span></a>}>
            {t("conta.notFoundBody")}
          </Empty>
        ) : (
          <ApiProblem label={t("common.apiDown")} message={result.error.message} />
        )}
      </AdminPage>
    );
  }

  const d = result.data;
  const a = d.account;
  const soon = t("common.comesIn", { slice: "SA6" });
  const usage = d.usage_30d;

  return (
    <AdminPage
      nav="contas"
      title={a.name}
      desc={t("conta.since", { date: f.date(a.created_at), slug: a.slug })}
      crumbs={[...crumbs, { label: a.name }]}
      avatar={<span className="sa-biz is-l" aria-hidden="true">{a.name.charAt(0).toUpperCase()}</span>}
      actions={
        <>
          <SoonButton label={t("conta.actEnter")} reason={soon} />
          <SoonButton label={t("conta.actCredit")} reason={soon} />
          <SoonButton label={t("conta.actSuspend")} reason={soon} />
        </>
      }
    >
      <Note kind="draft" label={t("shell.readOnly")}>
        {t("conta.actionsNote")} {t("conta.audited")}
      </Note>
      <div style={{ height: 16 }} />
      <Metrics
        items={[
          {
            label: t("conta.metPlan"),
            value: a.plan?.name ?? t("conta.noPlan"),
            tag: a.plan?.provisional ? <Tag kind="sim">{t("common.provisional")}</Tag> : undefined,
          },
          {
            label: t("conta.metBalance"),
            value: f.credits(d.credits.balance),
            detail: t("conta.metAvailable", { available: f.credits(d.credits.available), reserved: f.credits(d.credits.reserved) }),
          },
          { label: t("conta.metMembers"), value: f.int(a.member_count) },
          { label: t("conta.metLocale"), value: a.locale, detail: codeLabel(t, "locale", a.locale) },
          { label: t("conta.metStatus"), value: codeLabel(t, "accountStatus", a.status) },
        ]}
      />

      <div className="sa-row c2-1">
        <Card id="conta-membros" title={t("conta.members")} flush>
          <DataTable<Member>
            caption={t("conta.members")}
            rows={d.members}
            rowKey={(m) => m.user_id}
            empty={t("common.empty")}
            columns={[
              {
                key: "person",
                label: t("conta.colPerson"),
                cell: (m) => (
                  <div className="sa-cell-m">
                    <b>{m.full_name || m.email || dash}</b>
                    <small>{m.email ?? dash}</small>
                  </div>
                ),
              },
              { key: "role", label: t("conta.colRole"), nowrap: true, cell: (m) => codeLabel(t, "role", m.role) },
              { key: "since", label: t("conta.colMemberSince"), nowrap: true, cell: (m) => f.date(m.member_since) },
              { key: "last", label: t("conta.colLastSeen"), nowrap: true, cell: (m) => (m.last_sign_in_at ? f.dateTime(m.last_sign_in_at) : dash) },
            ]}
          />
        </Card>
        <Card id="conta-assinatura" title={t("conta.subscription")}>
          {d.subscription ? (
            <dl className="sa-kv">
              <dt>{t("conta.subStatus")}</dt>
              <dd>{codeLabel(t, "subscription", d.subscription.status)}</dd>
              <dt>{t("conta.subPlan")}</dt>
              <dd>
                <span className="sa-tags">
                  {d.subscription.plan}
                  {d.subscription.provisional ? <Tag kind="sim">{t("common.provisional")}</Tag> : null}
                </span>
              </dd>
              <dt>{t("conta.subProvider")}</dt>
              <dd>{codeLabel(t, "provider", d.subscription.provider)}</dd>
              <dt>{t("conta.subMethod")}</dt>
              <dd>{codeLabel(t, "method", d.subscription.method)}</dd>
              <dt>{t("conta.subPeriodEnd")}</dt>
              <dd>{d.subscription.current_period_end ? f.date(d.subscription.current_period_end) : dash}</dd>
            </dl>
          ) : (
            <p className="sa-mut">{t("conta.subscriptionEmpty")}</p>
          )}
        </Card>
      </div>

      <Card id="conta-extrato" title={t("conta.ledger")} sub={t("conta.ledgerSub")} flush>
        <DataTable<Entry>
          caption={t("conta.ledger")}
          rows={d.ledger}
          rowKey={(e) => e.id}
          empty={t("conta.ledgerEmpty")}
          columns={[
            { key: "when", label: t("conta.colWhen"), nowrap: true, cell: (e) => f.dateTime(e.created_at) },
            { key: "entry", label: t("conta.colEntry"), nowrap: true, cell: (e) => codeLabel(t, "ledger", e.entry_type) },
            { key: "amount", label: t("conta.colAmount"), align: "r", nowrap: true, cell: (e) => <span className="sa-num">{f.signed(e.amount)}</span> },
            { key: "note", label: t("conta.colNote"), cell: (e) => (e.note ? <span className="sa-mut">{e.note}</span> : dash) },
          ]}
        />
      </Card>

      <div className="sa-row c2">
        <Card id="conta-uso" title={t("conta.usage")}>
          <dl className="sa-kv">
            <dt>{t("conta.usageRequests")}</dt>
            <dd className="sa-num">{f.int(usage.requests)}</dd>
            <dt>{t("conta.usageCharged")}</dt>
            <dd className="sa-num">{f.credits(usage.credits_charged)}</dd>
            <dt>{t("conta.usageCalls")}</dt>
            <dd className="sa-num">{f.int(usage.llm_calls)}</dd>
            <dt>{t("conta.usageConversation")}</dt>
            <dd className="sa-num">{f.int(usage.conversation_calls)}</dd>
            <dt>{t("conta.usageCost")}</dt>
            <dd>
              <span className="sa-num">{f.usd(usage.ai_cost_usd, 4)}</span>{" "}
              <small className="sa-mut">
                {t("conta.usageCostSub", { deliveries: f.usd(usage.ai_cost_deliveries_usd, 4), conversation: f.usd(usage.ai_cost_conversation_usd, 4) })}
              </small>
            </dd>
          </dl>
        </Card>
        <Card id="conta-suporte" title={t("conta.support")} flush>
          <DataTable<Access>
            caption={t("conta.support")}
            rows={d.support_accesses}
            rowKey={(s) => s.id}
            empty={t("conta.supportEmpty")}
            columns={[
              { key: "who", label: t("conta.colAdmin"), cell: (s) => s.admin_email ?? dash },
              { key: "reason", label: t("conta.colReason"), cell: (s) => s.reason },
              { key: "start", label: t("conta.colStarted"), nowrap: true, cell: (s) => f.dateTime(s.started_at) },
              {
                key: "end",
                label: t("conta.colEnded"),
                nowrap: true,
                cell: (s) => (s.ended_at ? f.dateTime(s.ended_at) : <Status kind="prog" small>{f.dateTime(s.expires_at)}</Status>),
              },
            ]}
          />
        </Card>
      </div>
    </AdminPage>
  );
}
