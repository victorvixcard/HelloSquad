import { unwrap } from "@hellosquad/contracts";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPage } from "@/components/admin/AdminPage";
import { BalanceDialog } from "@/components/admin/health/BalanceDialog";
import { ApiProblem, Card, DataTable, Metrics, Note, Status, type StatusKind } from "@/components/admin/ui";
import { adminRead, type BalanceReport, type ProviderHealthItem } from "@/lib/admin";
import { adminFormat } from "@/lib/admin-format";
import { codeLabel } from "@/lib/admin-labels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.saude");
  return { title: t("title") };
}

/** Estado do provedor → "um desenho por estado" da V4.6 (o SA0 usa os mesmos). */
const STATE_KIND: Record<string, StatusKind> = {
  working: "done",
  failing: "fail",
  simulated: "draft",
  local_only: "prog",
  not_integrated: "block",
  account_not_created: "block",
};
const INTEGRATED = new Set(["working", "failing"]);
/** Sem conta ou sem integração não há saldo para ler no painel do provedor. */
const NO_BALANCE = new Set(["not_integrated", "account_not_created"]);

/**
 * Saúde das APIs (SA0 `saude-apis.html` → `GET /admin/providers` e `PATCH /admin/providers/{provider}/balance`): um
 * cartão por provedor com estado, chave (só "configurada" ou "ausente", nunca o segredo), chamadas e falhas, gasto em
 * 24 h / 7 dias / 30 dias / desde o início, última falha e última recusa por saldo; saldo lido no painel do provedor,
 * informado à mão, com alerta abaixo do limiar. Nada muda sozinho.
 */
export default async function HealthPage() {
  const [t, locale] = await Promise.all([getTranslations("admin"), getLocale()]);
  const f = adminFormat(locale);
  const dash = t("common.dash");
  const providers = await adminRead((api) => unwrap(api.GET("/admin/providers")), "/admin/saude");
  if (!providers.ok) {
    return (
      <AdminPage nav="saude" title={t("saude.title")} desc={t("saude.desc")}>
        <ApiProblem label={t("common.apiDown")} message={providers.error.message} />
      </AdminPage>
    );
  }
  const items = providers.data.items;
  const name = (p: ProviderHealthItem) => (t.has(`codes.provider.${p.provider}` as never) ? t(`codes.provider.${p.provider}` as never) : p.display_name);
  const purpose = (p: ProviderHealthItem) => (t.has(`saude.purpose.${p.provider}` as never) ? t(`saude.purpose.${p.provider}` as never) : p.purpose);
  const names = (list: ProviderHealthItem[]) => (list.length ? new Intl.ListFormat(locale, { type: "conjunction" }).format(list.map(name)) : t("saude.nobody"));
  const working = items.filter((p) => p.status === "working");
  const failing = items.filter((p) => p.status === "failing");
  const outside = items.filter((p) => !INTEGRATED.has(p.status));
  const spend30 = items.reduce((a, p) => a + (p.spend_usd ? Number(p.spend_usd.d30) : 0), 0);
  const pct1 = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const ordered = [...items.filter((p) => INTEGRATED.has(p.status) || p.spend_usd), ...items.filter((p) => !INTEGRATED.has(p.status) && !p.spend_usd)];

  const calls = (n: number | null | undefined, fails: number | null | undefined) => {
    if (n === null || n === undefined) return dash;
    const failText = fails ? t("saude.failures", { n: fails, pct: n ? pct1.format(fails / n) : dash }) : t("saude.noFailure");
    return `${t("saude.calls", { n })} · ${failText}`;
  };

  const balanceBlock = (p: ProviderHealthItem) => {
    const has = p.reported_balance !== null && p.reported_balance_currency !== null;
    const perDay = p.spend_usd && Number(p.spend_usd.d7) > 0 ? Number(p.spend_usd.d7) / 7 : null;
    const days = has && perDay && p.reported_balance_currency === "USD" ? Math.floor(Number(p.reported_balance) / perDay) : null;
    return (
      <div className="sa-grp hl-bal">
        <div className="sa-grp-h">
          <h3>{t("saude.balanceTitle")}</h3>
          <span className="sa-mut hl-bal-at">{has && p.reported_balance_at ? t("saude.readAt", { date: f.dateTime(p.reported_balance_at) }) : t("saude.neverRead")}</span>
        </div>
        <div className="hl-bal-b">
          <dl className="sa-kv hl-kv">
            <dt>{t("saude.balanceLabel")}</dt>
            <dd className="sa-num">{has ? f.money(p.reported_balance!, p.reported_balance_currency!) : dash}</dd>
            <dt>{t("saude.alertBelow")}</dt>
            <dd className="sa-num">{p.alert_below !== null ? f.money(p.alert_below, p.reported_balance_currency ?? "USD") : t("saude.noThreshold")}</dd>
          </dl>
          <div className="hl-bal-st" role="status">
            {!has ? (
              <span className="sa-mut">{t("saude.noBalance")}</span>
            ) : p.balance_alert ? (
              <Status kind="you">{t("saude.below")}</Status>
            ) : p.alert_below !== null ? (
              <Status kind="done">{t("saude.above")}</Status>
            ) : (
              <span className="sa-mut">{t("saude.noThresholdHint")}</span>
            )}
            <p>
              {p.balance_alert ? <b>{t("saude.belowAction", { name: name(p) })} </b> : null}
              {days !== null && perDay !== null
                ? days < 1
                  ? t("saude.paceUnderDay", { perDay: f.usd(perDay) })
                  : t("saude.pace", { perDay: f.usd(perDay), days })
                : null}
            </p>
          </div>
          <div className="hl-bal-a">
            <BalanceDialog provider={p.provider} providerName={name(p)} currency={p.reported_balance_currency} alertBelow={p.alert_below} />
            <span className="sa-mut">{t("saude.nothingAuto")}</span>
          </div>
          {p.balance_history && p.balance_history.length ? (
            <DataTable<BalanceReport>
              caption={t("saude.historyCaption", { name: name(p) })}
              rows={p.balance_history}
              rowKey={(h) => h.id}
              empty={dash}
              columns={[
                { key: "at", label: t("saude.colReadAt"), nowrap: true, cell: (h) => f.dateTime(h.read_at) },
                { key: "amount", label: t("saude.balanceLabel"), align: "r", nowrap: true, cell: (h) => <span className="sa-num">{f.money(h.amount, h.currency)}</span> },
                { key: "alert", label: t("saude.alertBelow"), align: "r", nowrap: true, cell: (h) => (h.alert_below === null ? dash : <span className="sa-num">{f.money(h.alert_below, h.currency)}</span>) },
                { key: "reason", label: t("saude.colReason"), cell: (h) => h.reason },
                { key: "by", label: t("saude.colBy"), cell: (h) => <small className="sa-mut">{h.reported_by_email ?? dash}</small> },
              ]}
            />
          ) : null}
        </div>
      </div>
    );
  };

  const card = (p: ProviderHealthItem) => {
    const on = INTEGRATED.has(p.status) || p.status === "simulated" || p.status === "local_only";
    /* A nota de hoje vem da API; o catálogo traduz a do estado atual, e a nota nova que ele não conhece aparece como veio. */
    const note = p.note === null ? null : t.has(`saude.note.${p.provider}_${p.status}` as never) ? t(`saude.note.${p.provider}_${p.status}` as never) : p.note;
    return (
      <Card
        key={p.provider}
        id={`pv-${p.provider}`}
        title={name(p)}
        sub={purpose(p)}
        h3
        actions={<Status kind={STATE_KIND[p.status] ?? "prog"}>{codeLabel(t, "providerStatus", p.status)}</Status>}
      >
        <dl className="sa-kv hl-kv">
          <dt>{t("saude.key")}</dt>
          <dd>{codeLabel(t, "secret", p.key)}</dd>
          <dt>{t("saude.last24")}</dt>
          <dd>{on ? calls(p.calls_24h, p.failures_24h) : dash}</dd>
          <dt>{t("saude.last7")}</dt>
          <dd>{on ? calls(p.calls_7d, p.failures_7d) : dash}</dd>
          <dt>{t("saude.lastFailure")}</dt>
          <dd>
            {p.last_failure_at ? (
              <>
                <span className="sa-mono">{f.dateTime(p.last_failure_at)}</span>
                {p.last_failure_text ? <> · {p.last_failure_text}</> : null}
              </>
            ) : on ? (
              t("saude.none")
            ) : (
              dash
            )}
          </dd>
          <dt>{t("saude.balanceRefusal")}</dt>
          <dd>{p.last_balance_refusal_at ? f.dateTime(p.last_balance_refusal_at) : on ? t("saude.none") : dash}</dd>
        </dl>
        {p.spend_usd ? (
          <div className="hl-spend">
            <div className="hl-spend-h">
              <span className="sa-lbl">{t("saude.spend")}</span>
              <a className="sa-rowlink" href="/admin/modelos#regras">
                {t("saude.costsByTask")}
              </a>
            </div>
            <div className="hl-spend-g">
              {(
                [
                  ["h24", t("saude.h24")],
                  ["d7", t("saude.d7")],
                  ["d30", t("saude.d30")],
                  ["total", t("saude.total")],
                ] as const
              ).map(([k, label]) => (
                <div key={k} className="hl-spend-c">
                  <div>{label}</div>
                  <div className="sa-num">{f.usd(p.spend_usd![k])}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {NO_BALANCE.has(p.status) ? null : balanceBlock(p)}
        {note ? <p className="hl-today">{note}</p> : null}
      </Card>
    );
  };

  return (
    <AdminPage nav="saude" title={t("saude.title")} desc={t("saude.desc")}>
      <Metrics
        items={[
          { label: t("saude.metProviders"), value: f.int(items.length), detail: t("saude.metProvidersSub", { n: items.length - outside.length, outsideN: outside.length }) },
          { label: t("saude.metWorking"), value: f.int(working.length), detail: names(working) },
          {
            label: t("saude.metFailing"),
            value: f.int(failing.length),
            kind: failing.length ? "you" : undefined,
            detail: failing.length ? failing.map((p) => t("saude.failing24", { name: name(p), n: p.failures_24h ?? 0 })).join(" · ") : t("saude.nobody"),
          },
          { label: t("saude.metOutside"), value: f.int(outside.length), detail: outside.length ? outside.map((p) => `${name(p)}: ${codeLabel(t, "providerStatus", p.status).toLowerCase()}`).join("; ") : t("saude.nobody") },
          { label: t("saude.metSpend30"), value: f.usd(spend30), detail: t("saude.metSpend30Sub") },
        ]}
      />
      <div className="sa-row c2 is-eq hl-grid">{ordered.map(card)}</div>
      <Note label={t("saude.howTitle")}>{t.rich("saude.how", { b: (c) => <b>{c}</b> })}</Note>
    </AdminPage>
  );
}
