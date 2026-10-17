import { unwrap } from "@hellosquad/contracts";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPage } from "@/components/admin/AdminPage";
import { WebhookActions } from "@/components/admin/actions/OpsActions";
import { RecentAudit } from "@/components/admin/actions/RecentAudit";
import { ApiProblem, Card, DataTable, Note, Status, Tag, type StatusKind } from "@/components/admin/ui";
import { adminRead, type PaymentsOverview } from "@/lib/admin";
import { adminFormat } from "@/lib/admin-format";
import { codeLabel } from "@/lib/admin-labels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.pagamentos");
  return { title: t("title") };
}

type Subscription = PaymentsOverview["subscriptions"][number];
type Payment = PaymentsOverview["payments"][number];
type Webhook = PaymentsOverview["webhooks"][number];

/** Ações do Super Admin em pagamentos (a auditoria do pé da página mostra só estas). */
const PAYMENT_ACTIONS = ["payment.webhook_reprocessed", "payment.reconciled"] as const;

const PROVIDER_KIND: Record<string, StatusKind> = {
  working: "done",
  failing: "fail",
  simulated: "draft",
  local_only: "draft",
  not_integrated: "pause",
  account_not_created: "pause",
};
const PAYMENT_KIND: Record<string, StatusKind> = { confirmed: "done", pending: "prog", failed: "fail", refunded: "pause", cancelled: "pause", expired: "pause" };
const SUBSCRIPTION_KIND: Record<string, StatusKind> = { active: "done", pending: "prog", past_due: "you", cancelled: "pause", canceled: "pause", expired: "pause" };

/**
 * Pagamentos (SA0 `pagamentos.html` → `GET /admin/payments` + estado dos provedores em `GET /admin/providers`):
 * provedores (chave e segredo só como configurada/ausente), assinaturas, cobranças, webhooks e falhas. Asaas e Mercado
 * Pago aparecem como "conta não criada" enquanto for o caso. Por webhook (SA6b): reprocessar e marcar conciliação, com motivo.
 */
export default async function PaymentsPage() {
  const [t, locale] = await Promise.all([getTranslations("admin"), getLocale()]);
  const f = adminFormat(locale);
  const dash = t("common.dash");
  const [payments, providers] = await Promise.all([
    adminRead((api) => unwrap(api.GET("/admin/payments")), "/admin/pagamentos"),
    adminRead((api) => unwrap(api.GET("/admin/providers")), "/admin/pagamentos"),
  ]);
  const health = new Map((providers.ok ? providers.data.items : []).map((p) => [p.provider, p]));
  const money = (amount: string | null, currency: string | null) => (amount && currency ? <span className="sa-num">{f.money(amount, currency)}</span> : dash);
  const account = (id: string | null, name: string | null) => (id && name ? <a className="sa-rowlink" href={`/admin/contas/${id}`}>{name}</a> : (name ?? dash));

  return (
    <AdminPage
      audited
      nav="pagamentos"
      title={t("pagamentos.title")}
      desc={t("pagamentos.desc")}
    >
      {payments.ok ? (
        <>
          <div className="sa-row c3">
            {payments.data.providers.map((p) => {
              const h = health.get(p.provider);
              return (
                <Card
                  key={p.provider}
                  id={`prov-${p.provider}`}
                  title={codeLabel(t, "provider", p.provider)}
                  actions={
                    <span className="sa-tags">
                      {p.selected ? <Tag kind="ok">{t("pagamentos.selected")}</Tag> : null}
                      {h ? (
                        <Status kind={PROVIDER_KIND[h.status] ?? "pause"} small>
                          {codeLabel(t, "providerStatus", h.status)}
                        </Status>
                      ) : null}
                    </span>
                  }
                >
                  <dl className="sa-kv">
                    <dt>{t("pagamentos.apiKey")}</dt>
                    <dd>{codeLabel(t, "secret", p.api_key)}</dd>
                    <dt>{t("pagamentos.webhookSecret")}</dt>
                    <dd>{codeLabel(t, "secret", p.webhook_secret)}</dd>
                  </dl>
                  {h?.note ? <p className="sa-mut" style={{ marginTop: 10, fontSize: 12.5 }}>{h.note}</p> : null}
                </Card>
              );
            })}
          </div>
          <Note kind="draft" label={t("pagamentos.apiKey")}>
            {t("pagamentos.secretsNote")}
          </Note>
          <div style={{ height: 16 }} />

          <Card id="pag-assinaturas" title={t("pagamentos.subscriptions")} flush>
            <DataTable<Subscription>
              caption={t("pagamentos.subscriptions")}
              rows={payments.data.subscriptions}
              rowKey={(s) => s.id}
              empty={t("pagamentos.subscriptionsEmpty")}
              columns={[
                { key: "account", label: t("pagamentos.colAccount"), cell: (s) => account(s.workspace_id, s.workspace_name) },
                {
                  key: "plan",
                  label: t("pagamentos.colPlan"),
                  nowrap: true,
                  cell: (s) => (
                    <span className="sa-tags">
                      {s.plan}
                      {s.provisional ? <Tag kind="sim">{t("common.provisional")}</Tag> : null}
                    </span>
                  ),
                },
                { key: "provider", label: t("pagamentos.colProvider"), nowrap: true, cell: (s) => codeLabel(t, "provider", s.provider) },
                { key: "method", label: t("pagamentos.colMethod"), nowrap: true, cell: (s) => codeLabel(t, "method", s.method) },
                {
                  key: "status",
                  label: t("pagamentos.colStatus"),
                  nowrap: true,
                  cell: (s) => (
                    <Status kind={SUBSCRIPTION_KIND[s.status] ?? "prog"} small>
                      {codeLabel(t, "subscription", s.status)}
                    </Status>
                  ),
                },
                { key: "next", label: t("pagamentos.colNext"), nowrap: true, cell: (s) => (s.current_period_end ? f.date(s.current_period_end) : dash) },
                { key: "amount", label: t("pagamentos.colAmount"), align: "r", nowrap: true, cell: (s) => money(s.amount, s.currency) },
              ]}
            />
          </Card>

          <Card id="pag-cobrancas" title={t("pagamentos.payments")} flush>
            <DataTable<Payment>
              caption={t("pagamentos.payments")}
              rows={payments.data.payments}
              rowKey={(p) => p.id}
              empty={t("pagamentos.paymentsEmpty")}
              columns={[
                { key: "when", label: t("pagamentos.colWhen"), nowrap: true, cell: (p) => f.dateTime(p.created_at) },
                { key: "account", label: t("pagamentos.colAccount"), cell: (p) => account(p.workspace_id, p.workspace_name) },
                { key: "kind", label: t("pagamentos.colKind"), nowrap: true, cell: (p) => codeLabel(t, "paymentKind", p.kind) },
                { key: "provider", label: t("pagamentos.colProvider"), nowrap: true, cell: (p) => `${codeLabel(t, "provider", p.provider)} · ${codeLabel(t, "method", p.method)}` },
                {
                  key: "status",
                  label: t("pagamentos.colStatus"),
                  nowrap: true,
                  cell: (p) => (
                    <Status kind={PAYMENT_KIND[p.status] ?? "prog"} small>
                      {codeLabel(t, "payment", p.status)}
                    </Status>
                  ),
                },
                { key: "credits", label: t("pagamentos.colCredits"), align: "r", nowrap: true, cell: (p) => (p.credits ? <span className="sa-num">{f.credits(p.credits)}</span> : dash) },
                { key: "amount", label: t("pagamentos.colAmount"), align: "r", nowrap: true, cell: (p) => money(p.amount, p.currency) },
                { key: "confirmed", label: t("pagamentos.colConfirmed"), nowrap: true, cell: (p) => (p.confirmed_at ? f.dateTime(p.confirmed_at) : dash) },
              ]}
            />
          </Card>

          <div className="sa-row c2">
            <Card id="pag-webhooks" title={t("pagamentos.webhooks")} flush>
              <DataTable<Webhook>
                caption={t("pagamentos.webhooks")}
                rows={payments.data.webhooks}
                rowKey={(w) => w.id}
                empty={t("pagamentos.webhooksEmpty")}
                columns={[
                  { key: "when", label: t("pagamentos.colWhen"), nowrap: true, cell: (w) => f.dateTime(w.received_at) },
                  { key: "provider", label: t("pagamentos.colProvider"), nowrap: true, cell: (w) => codeLabel(t, "provider", w.provider) },
                  {
                    key: "event",
                    label: t("pagamentos.colEvent"),
                    cell: (w) => (
                      <div className="sa-cell-m">
                        <b className="sa-code">{w.event_type}</b>
                        <small className="sa-code">{w.event_id}</small>
                      </div>
                    ),
                  },
                  { key: "account", label: t("pagamentos.colAccount"), cell: (w) => account(w.workspace_id, w.workspace_name) },
                  {
                    key: "outcome",
                    label: t("pagamentos.colOutcome"),
                    cell: (w) => (
                      <div className="sa-cell-m">
                        <span>{codeLabel(t, "webhookOutcome", w.outcome)}</span>
                        {w.reconciled_at ? (
                          <small title={w.reconciliation_reason ?? undefined}>{t("acoes.webhook.reconciledAt", { when: f.dateTime(w.reconciled_at) })}</small>
                        ) : null}
                        <WebhookActions eventId={w.id} event={w.event_type} outcome={w.outcome} reconciled={Boolean(w.reconciled_at)} />
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
            <Card id="pag-falhas" title={t("pagamentos.failures")} flush>
              <DataTable<Payment>
                caption={t("pagamentos.failures")}
                rows={payments.data.payments.filter((p) => p.status === "failed")}
                rowKey={(p) => p.id}
                empty={t("pagamentos.failuresEmpty")}
                columns={[
                  { key: "when", label: t("pagamentos.colWhen"), nowrap: true, cell: (p) => f.dateTime(p.created_at) },
                  { key: "account", label: t("pagamentos.colAccount"), cell: (p) => account(p.workspace_id, p.workspace_name) },
                  { key: "amount", label: t("pagamentos.colAmount"), align: "r", nowrap: true, cell: (p) => money(p.amount, p.currency) },
                ]}
              />
            </Card>
          </div>
        </>
      ) : (
        <ApiProblem label={t("common.apiDown")} message={payments.error.message} />
      )}
      <RecentAudit
        id="pag-auditoria"
        title={t("acoes.webhook.recent")}
        sub={t("conta.recentSub")}
        empty={t("acoes.webhook.recentEmpty")}
        category="billing"
        actions={PAYMENT_ACTIONS}
      />
    </AdminPage>
  );
}
