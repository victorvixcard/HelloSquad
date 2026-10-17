import { unwrap } from "@hellosquad/contracts";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPage } from "@/components/admin/AdminPage";
import { AuditCsvButton } from "@/components/admin/AuditCsvButton";
import { FilterSelect } from "@/components/admin/Filters";
import { ApiProblem, Card, DataTable, Note, Pager } from "@/components/admin/ui";
import { adminRead, type AuditItem } from "@/lib/admin";
import { adminFormat } from "@/lib/admin-format";
import { codeLabel, hrefWith, one } from "@/lib/admin-labels";
import { TIME_ZONE } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.auditoria");
  return { title: t("title") };
}

const ACTORS = ["platform_admin", "customer", "system"] as const;
type Actor = (typeof ACTORS)[number];
/** Tipos que a API (`app.admin_audit_events`, SA1) devolve em `category`. */
const CATEGORIES = [
  "support_access",
  "approval",
  "memory",
  "work",
  "conversation",
  "account",
  "contacts",
  "ledger",
  "billing",
  "configuration",
  "other",
] as const;

/** Dia de hoje em Brasília (a API lê `since`/`until` em dias de Brasília), menos `back` dias. */
function brDay(back = 0): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

/** Resumo do payload em uma linha (mono): o que mudou, sem abrir o JSON inteiro. */
function summary(payload: AuditItem["payload"]): string {
  if (!payload || typeof payload !== "object") return "";
  const text = JSON.stringify(payload);
  return text === "{}" ? "" : text;
}

type Search = Promise<Record<string, string | string[] | undefined>>;

/**
 * Auditoria (SA0 `auditoria.html` → `GET /admin/audit`): filtros quem / conta / tipo / período e cursor. Nada é
 * apagado; o painel só lê (a API lê `audit_events` por função, como a S0 garante). "Exportar CSV" (SA7b) gera no
 * navegador o arquivo da página carregada, com as mesmas colunas da tabela e os filtros de agora.
 */
export default async function AuditPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const actorParam = one(sp.quem);
  const actor = ACTORS.includes(actorParam as Actor) ? (actorParam as Actor) : undefined;
  const workspace_id = one(sp.conta);
  const category = one(sp.tipo);
  const periodo = one(sp.periodo);
  const since = periodo === "hoje" ? brDay(0) : periodo === "7d" ? brDay(6) : undefined;
  const cursor = one(sp.cursor);
  const [t, locale] = await Promise.all([getTranslations("admin"), getLocale()]);
  const f = adminFormat(locale);
  const dash = t("common.dash");
  const [audit, accounts] = await Promise.all([
    adminRead(
      (api) => unwrap(api.GET("/admin/audit", { params: { query: { actor, workspace_id, category, since, cursor, limit: 50 } } })),
      "/admin/auditoria",
    ),
    adminRead((api) => unwrap(api.GET("/admin/accounts", { params: { query: { limit: 100 } } })), "/admin/auditoria"),
  ]);
  const keep = { quem: actor, conta: workspace_id, tipo: category, periodo };
  const link = (patch: Record<string, string | undefined>) => hrefWith("/admin/auditoria", { ...keep, ...patch });

  const whoTabs: { value?: Actor; label: string }[] = [
    { label: t("auditoria.whoAll") },
    ...ACTORS.map((a) => ({ value: a, label: codeLabel(t, "actor", a) })),
  ];
  const periods: { value?: string; label: string }[] = [
    { value: "hoje", label: t("auditoria.today") },
    { value: "7d", label: t("auditoria.days7") },
    { label: t("auditoria.days30") },
  ];
  const accountOptions = [
    { value: "", label: t("common.allF") },
    ...(accounts.ok ? accounts.data.items.map((a) => ({ value: a.id, label: a.name })) : []),
  ];
  const typeOptions = [{ value: "", label: t("common.all") }, ...CATEGORIES.map((c) => ({ value: c, label: codeLabel(t, "category", c) }))];
  const csv = audit.ok
    ? audit.data.items.map((e) => [
        e.created_at,
        `${codeLabel(t, "actor", e.actor)} · ${e.actor_name || e.actor_email || e.actor_type}`,
        e.workspace_name ?? t("auditoria.platform"),
        codeLabel(t, "category", e.category),
        e.action,
        summary(e.payload),
      ])
    : null;

  return (
    <AdminPage
      nav="auditoria"
      title={t("auditoria.title")}
      desc={t("auditoria.desc")}
      actions={
        csv ? (
          <AuditCsvButton
            label={t("auditoria.export")}
            title={t("auditoria.exportTitle")}
            filename={`${t("auditoria.csvFile")}-${brDay(0)}.csv`}
            header={[t("auditoria.colWhen"), t("auditoria.colWho"), t("auditoria.colAccount"), t("auditoria.colType"), t("auditoria.colAction"), t("auditoria.colDetail")]}
            rows={csv}
            done={t("auditoria.exported", { n: csv.length })}
          />
        ) : undefined
      }
    >
      <div className="sa-tool" style={{ marginBottom: 16 }}>
        <nav className="sa-segl" aria-label={t("auditoria.who")}>
          {whoTabs.map((w) => (
            <a key={w.label} href={link({ quem: w.value, cursor: undefined })} aria-current={actor === w.value ? "page" : undefined}>
              {w.label}
            </a>
          ))}
        </nav>
        <FilterSelect name="conta" title={t("auditoria.account")} prefix={t("auditoria.account")} options={accountOptions} />
        <FilterSelect name="tipo" title={t("auditoria.type")} prefix={t("auditoria.type")} options={typeOptions} />
        <span className="sa-grow" />
        <nav className="sa-segl" aria-label={t("auditoria.period")}>
          {periods.map((p) => (
            <a key={p.label} href={link({ periodo: p.value })} aria-current={periodo === p.value ? "page" : undefined}>
              {p.label}
            </a>
          ))}
        </nav>
      </div>
      {audit.ok ? (
        <>
          <Card id="aud-eventos" title={t("auditoria.events")} flush>
            <DataTable<AuditItem>
              caption={t("auditoria.events")}
              rows={audit.data.items}
              rowKey={(e) => e.id}
              empty={t("auditoria.empty")}
              columns={[
                { key: "when", label: t("auditoria.colWhen"), nowrap: true, cell: (e) => f.dateTime(e.created_at) },
                {
                  key: "who",
                  label: t("auditoria.colWho"),
                  cell: (e) => (
                    <div className="sa-cell-m">
                      <b>{codeLabel(t, "actor", e.actor)}</b>
                      <small>{e.actor_name || e.actor_email || e.actor_type}</small>
                    </div>
                  ),
                },
                {
                  key: "account",
                  label: t("auditoria.colAccount"),
                  cell: (e) =>
                    e.workspace_id && e.workspace_name ? (
                      <a className="sa-rowlink" href={`/admin/contas/${e.workspace_id}`}>
                        {e.workspace_name}
                      </a>
                    ) : (
                      <span className="sa-mut">{e.workspace_name ?? t("auditoria.platform")}</span>
                    ),
                },
                { key: "type", label: t("auditoria.colType"), nowrap: true, cell: (e) => codeLabel(t, "category", e.category) },
                { key: "action", label: t("auditoria.colAction"), nowrap: true, cell: (e) => <span className="sa-code">{e.action}</span> },
                {
                  key: "detail",
                  label: t("auditoria.colDetail"),
                  cell: (e) => {
                    const s = summary(e.payload);
                    return s ? (
                      <span className="sa-code sa-trunc" title={s}>
                        {s}
                      </span>
                    ) : (
                      dash
                    );
                  },
                },
              ]}
            />
          </Card>
          <Pager
            nextHref={audit.data.next_cursor ? link({ cursor: audit.data.next_cursor }) : null}
            firstHref={cursor ? link({}) : null}
            nextLabel={t("common.next")}
            firstLabel={t("common.first")}
          />
        </>
      ) : audit.error.status === 422 ? (
        <Note kind="warn" label={t("auditoria.period")}>
          {t("auditoria.invalidPeriod")}
        </Note>
      ) : (
        <ApiProblem label={t("common.apiDown")} message={audit.error.message} />
      )}
    </AdminPage>
  );
}
