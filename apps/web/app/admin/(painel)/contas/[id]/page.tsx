import { unwrap } from "@hellosquad/contracts";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { AdminPage } from "@/components/admin/AdminPage";
import { AccountStatusDialog, CreditAdjustDialog, EnterSupportDialog, SupportSessionBand } from "@/components/admin/actions/AccountActions";
import { RecentAudit } from "@/components/admin/actions/RecentAudit";
import { ApiProblem, Card, DataTable, Empty, Metrics, Note, Status, Tag } from "@/components/admin/ui";
import { adminRead, loadAdminMe, type AccountDetail } from "@/lib/admin";
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

/** Ações do Super Admin numa conta (a Auditoria desta conta mostra só estas). */
const ACCOUNT_ACTIONS = [
  "support.session_started",
  "support.session_ended",
  "credits.adjusted",
  "workspace.suspended",
  "workspace.reactivated",
] as const;

/**
 * Detalhe da conta (SA0 `conta.html` → `GET /admin/accounts/{id}`): plano, saldo, membros, idioma, desde, extrato,
 * acessos do suporte, uso e assinatura. Abrir grava `support.account_viewed` na auditoria (a API faz). Ações (SA6b):
 * entrar no ambiente (sessão de suporte só leitura), ajustar crédito e suspender/reativar, sempre com motivo; cidade e
 * PF/PJ não existem no banco e não aparecem.
 */
export default async function AccountPage({ params }: { params: Params }) {
  const { id } = await params;
  const [t, locale, me] = await Promise.all([getTranslations("admin"), getLocale(), loadAdminMe()]);
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
          <Empty title={t("conta.notFound")} agent="nexo" expression="serio" actions={<Link className="hs-btn hs-btn--soft hs-btn--s" href="/admin/contas"><span className="hs-lbl">{t("conta.backToList")}</span></Link>}>
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
  const usage = d.usage_30d;
  const myEmail = me.ok ? me.data.email : null;
  // A sessão aberta por quem está no painel (uma por Super Admin e conta); vencida não conta, a API já não deixa ler.
  const session = d.support_accesses.find(
    (s) => !s.ended_at && new Date(s.expires_at).getTime() > Date.now() && myEmail !== null && s.admin_email === myEmail,
  );

  return (
    <AdminPage
      audited
      nav="contas"
      title={a.name}
      desc={t("conta.since", { date: f.date(a.created_at), slug: a.slug })}
      crumbs={[...crumbs, { label: a.name }]}
      avatar={<span className="sa-biz is-l" aria-hidden="true">{a.name.charAt(0).toUpperCase()}</span>}
      actions={
        <>
          <CreditAdjustDialog workspaceId={a.id} name={a.name} balance={d.credits.balance} available={d.credits.available} />
          <AccountStatusDialog workspaceId={a.id} name={a.name} status={a.status} />
          <EnterSupportDialog
            workspaceId={a.id}
            name={a.name}
            disabled={Boolean(session) || a.status !== "active"}
            disabledReason={
              session ? t("acoes.enter.busy") : a.status === "suspended" ? t("acoes.enter.suspended") : a.status === "deleted" ? t("acoes.enter.deleted") : undefined
            }
          />
        </>
      }
    >
      {session ? (
        <SupportSessionBand workspaceId={a.id} name={a.name} expiresAt={session.expires_at} reason={session.reason} />
      ) : null}
      {a.status === "suspended" ? (
        <Note kind="warn" label={t("conta.suspendedLabel")}>
          <b>{t("conta.suspendedBand")}</b>{" "}
          {a.suspension_reason ? t("conta.suspendedReason", { reason: a.suspension_reason }) : null} {t("conta.suspendedEffect")}
        </Note>
      ) : null}
      <Note kind="draft" label={t("conta.writeLabel")}>
        {t("conta.writeNote")} {t("conta.audited")}
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
          { label: t("conta.metStatus"), value: codeLabel(t, "accountStatus", a.status), detail: a.status === "suspended" ? (a.suspension_reason ?? undefined) : undefined },
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

      <RecentAudit
        id="conta-auditoria"
        title={t("conta.recent")}
        sub={t("conta.recentSub")}
        empty={t("conta.recentEmpty")}
        workspaceId={a.id}
        actions={ACCOUNT_ACTIONS}
      />
    </AdminPage>
  );
}
