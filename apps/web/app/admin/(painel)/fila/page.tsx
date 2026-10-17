import { unwrap } from "@hellosquad/contracts";
import { getAgent, isAgentId } from "@hellosquad/ui";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPage } from "@/components/admin/AdminPage";
import { RUN_KIND, RUN_STATES, type RunState } from "@/components/admin/runs";
import { AgentLabel, ApiProblem, Card, DataTable, Metrics, Pager, SoonButton, Status } from "@/components/admin/ui";
import { adminRead, type QueueOverview, type QueueRun } from "@/lib/admin";
import { adminFormat } from "@/lib/admin-format";
import { codeLabel, hrefWith, one } from "@/lib/admin-labels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.fila");
  return { title: t("title") };
}

type Queue = QueueOverview["queues"][number];
type Search = Promise<Record<string, string | string[] | undefined>>;

/**
 * Fila de trabalhos (SA0 `fila.html` → `GET /admin/queue`): filas pgmq, contagem por estado, runs com conta, agente,
 * tentativas (1 de 3), posse e último erro; abrir o run mostra passos e eventos. Reenfileirar e cancelar: SA6.
 */
export default async function QueuePage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const statusParam = one(sp.estado);
  const status = RUN_STATES.includes(statusParam as RunState) ? statusParam : undefined;
  const cursor = one(sp.cursor);
  const [t, locale] = await Promise.all([getTranslations("admin"), getLocale()]);
  const f = adminFormat(locale);
  const dash = t("common.dash");
  const result = await adminRead(
    (api) => unwrap(api.GET("/admin/queue", { params: { query: { status, cursor, limit: 50 } } })),
    "/admin/fila",
  );
  const soon = t("common.comesIn", { slice: "SA6" });

  if (!result.ok) {
    return (
      <AdminPage nav="fila" title={t("fila.title")} desc={t("fila.desc")}>
        <ApiProblem label={t("common.apiDown")} message={result.error.message} />
      </AdminPage>
    );
  }
  const q = result.data;
  const counts = q.status_counts as Record<string, number>;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <AdminPage
      nav="fila"
      title={t("fila.title")}
      desc={t("fila.desc")}
      actions={
        <>
          <SoonButton label={t("fila.requeue")} reason={soon} />
          <SoonButton label={t("fila.cancel")} reason={soon} />
        </>
      }
    >
      <Metrics
        cols={4}
        items={(["queued", "running", "waiting_approval", "failed"] as const).map((s) => ({
          label: codeLabel(t, "run", s),
          value: f.int(counts[s] ?? 0),
          kind: s === "failed" && counts[s] ? ("you" as const) : undefined,
        }))}
      />

      <Card id="fila-filas" title={t("fila.queues")} flush>
        <DataTable<Queue>
          caption={t("fila.queues")}
          rows={q.queues}
          rowKey={(x) => x.queue_name}
          empty={t("common.empty")}
          columns={[
            {
              key: "name",
              label: t("fila.colQueue"),
              cell: (x) => (
                <div className="sa-cell-m">
                  <b>{codeLabel(t, "queue", x.queue_name)}</b>
                  <small className="sa-code">{x.queue_name}</small>
                </div>
              ),
            },
            { key: "queued", label: t("fila.colQueued"), align: "r", cell: (x) => <span className="sa-num">{f.int(x.queued)}</span> },
            { key: "flight", label: t("fila.colInFlight"), align: "r", cell: (x) => <span className="sa-num">{f.int(x.in_flight)}</span> },
            { key: "oldest", label: t("fila.colOldest"), nowrap: true, cell: (x) => (x.oldest_enqueued_at ? f.dateTime(x.oldest_enqueued_at) : dash) },
          ]}
        />
      </Card>

      <Card id="fila-runs" title={t("fila.runs")} flush>
        <div className="sa-tool" style={{ padding: "0 20px 14px" }}>
          <nav className="sa-segl" aria-label={t("fila.filterLabel")}>
            <a href="/admin/fila" aria-current={!status ? "page" : undefined}>
              {t("fila.all")}
              <span className="sa-nb">{f.int(total)}</span>
            </a>
            {RUN_STATES.map((s) => (
              <a key={s} href={hrefWith("/admin/fila", { estado: s })} aria-current={status === s ? "page" : undefined}>
                {codeLabel(t, "run", s)}
                {counts[s] ? <span className={`sa-nb${s === "failed" ? " is-hot" : ""}`}>{f.int(counts[s])}</span> : null}
              </a>
            ))}
          </nav>
        </div>
        <DataTable<QueueRun>
          caption={t("fila.runs")}
          rows={q.runs}
          rowKey={(r) => r.id}
          empty={t("fila.empty")}
          columns={[
            {
              key: "run",
              label: t("fila.colRun"),
              nowrap: true,
              cell: (r) => (
                <a className="sa-rowlink sa-code" href={`/admin/fila/${r.id}`} aria-label={t("fila.openRun", { id: r.id.slice(0, 8) })}>
                  {r.id.slice(0, 8)}
                </a>
              ),
            },
            {
              key: "work",
              label: t("fila.colWork"),
              cell: (r) => (
                <div className="sa-cell-m">
                  <b>{r.work_title ?? t("fila.noWork")}</b>
                  <small>
                    {r.delivery_type ? <span className="sa-code">{r.delivery_type}</span> : null}
                    {r.delivery_type ? " · " : ""}
                    {codeLabel(t, "runKind", r.kind)}
                  </small>
                </div>
              ),
            },
            {
              key: "account",
              label: t("fila.colAccount"),
              cell: (r) => (
                <a className="sa-rowlink" href={`/admin/contas/${r.workspace_id}`}>
                  {r.workspace_name}
                </a>
              ),
            },
            {
              key: "agent",
              label: t("fila.colAgent"),
              nowrap: true,
              cell: (r) => (r.agent_id && isAgentId(r.agent_id) ? <AgentLabel agent={r.agent_id} name={getAgent(r.agent_id).name} /> : dash),
            },
            {
              key: "status",
              label: t("fila.colStatus"),
              nowrap: true,
              cell: (r) => (
                <Status kind={RUN_KIND[r.status] ?? "prog"} small>
                  {codeLabel(t, "run", r.status)}
                </Status>
              ),
            },
            {
              key: "attempts",
              label: t("fila.colAttempts"),
              nowrap: true,
              cell: (r) => t("common.of", { n: f.int(r.attempts), total: f.int(r.max_attempts) }),
            },
            { key: "created", label: t("fila.colCreated"), nowrap: true, cell: (r) => f.dateTime(r.created_at) },
            { key: "lease", label: t("fila.colLease"), nowrap: true, cell: (r) => (r.lease_until ? f.dateTime(r.lease_until) : dash) },
            {
              key: "error",
              label: t("fila.colError"),
              cell: (r) =>
                r.error_message || r.error_code ? (
                  <span className="sa-code sa-trunc" title={r.error_message ?? r.error_code ?? ""}>
                    {r.error_code ? `${r.error_code}: ` : ""}
                    {r.error_message ?? ""}
                  </span>
                ) : (
                  dash
                ),
            },
          ]}
        />
      </Card>
      <Pager
        nextHref={q.next_cursor ? hrefWith("/admin/fila", { estado: status, cursor: q.next_cursor }) : null}
        firstHref={cursor ? hrefWith("/admin/fila", { estado: status }) : null}
        nextLabel={t("common.next")}
        firstLabel={t("common.first")}
      />
    </AdminPage>
  );
}
