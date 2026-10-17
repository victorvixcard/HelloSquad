import { unwrap } from "@hellosquad/contracts";
import { getAgent, isAgentId } from "@hellosquad/ui";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { AdminPage } from "@/components/admin/AdminPage";
import { RUN_KIND } from "@/components/admin/runs";
import { RunActions } from "@/components/admin/actions/OpsActions";
import { AgentLabel, ApiProblem, Card, DataTable, Empty, Status } from "@/components/admin/ui";
import { adminRead, type RunDetail } from "@/lib/admin";
import { adminFormat } from "@/lib/admin-format";
import { codeLabel } from "@/lib/admin-labels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.fila");
  return { title: t("title") };
}

type Step = RunDetail["steps"][number];
type Event = RunDetail["events"][number];

/** Um run aberto (SA0 `fila.html`, passos do run → `GET /admin/queue/runs/{id}`): resumo, passos e eventos. */
export default async function RunPage({ params }: { params: Promise<{ run: string }> }) {
  const { run: runId } = await params;
  const [t, locale] = await Promise.all([getTranslations("admin"), getLocale()]);
  const f = adminFormat(locale);
  const dash = t("common.dash");
  const result = await adminRead(
    (api) => unwrap(api.GET("/admin/queue/runs/{run_id}", { params: { path: { run_id: runId } } })),
    `/admin/fila/${runId}`,
  );
  const crumbs = [{ label: t("run.crumb"), href: "/admin/fila" }];

  if (!result.ok) {
    const missing = result.error.status === 404 || result.error.status === 422;
    return (
      <AdminPage nav="fila" title={missing ? t("run.notFound") : t("run.crumb")} crumbs={crumbs}>
        {missing ? (
          <Empty
            title={t("run.notFound")}
            agent="nexo"
            expression="serio"
            actions={
              <Link className="hs-btn hs-btn--soft hs-btn--s" href="/admin/fila">
                <span className="hs-lbl">{t("run.backToQueue")}</span>
              </Link>
            }
          >
            {t("run.notFoundBody")}
          </Empty>
        ) : (
          <ApiProblem label={t("common.apiDown")} message={result.error.message} />
        )}
      </AdminPage>
    );
  }

  const { run, steps, events } = result.data;
  const short = run.id.slice(0, 8);
  const tokens = (s: Step) =>
    s.input_tokens === null && s.output_tokens === null
      ? dash
      : `${f.tokens(s.input_tokens ?? 0)} · ${f.tokens(s.cache_read_tokens ?? 0)} · ${f.tokens(s.output_tokens ?? 0)}`;

  return (
    <AdminPage
      audited
      nav="fila"
      title={t("run.title", { id: short })}
      desc={run.work_title ?? undefined}
      crumbs={[...crumbs, { label: short }]}
      actions={<RunActions runId={run.id} status={run.status} work={run.work_title} account={run.workspace_name} />}
    >
      <Card id="run-resumo" title={t("run.summary")}>
        <dl className="sa-kv">
          <dt>{t("run.status")}</dt>
          <dd>
            <Status kind={RUN_KIND[run.status] ?? "prog"} small>
              {codeLabel(t, "run", run.status)}
            </Status>
          </dd>
          <dt>{t("run.account")}</dt>
          <dd>
            <a className="sa-rowlink" href={`/admin/contas/${run.workspace_id}`}>
              {run.workspace_name}
            </a>
          </dd>
          <dt>{t("run.agent")}</dt>
          <dd>{run.agent_id && isAgentId(run.agent_id) ? <AgentLabel agent={run.agent_id} name={getAgent(run.agent_id).name} /> : dash}</dd>
          <dt>{t("run.delivery")}</dt>
          <dd className="sa-code">{run.delivery_type ?? dash}</dd>
          <dt>{t("run.kind")}</dt>
          <dd>{codeLabel(t, "runKind", run.kind)}</dd>
          <dt>{t("run.queue")}</dt>
          <dd>{run.queue_name ? codeLabel(t, "queue", run.queue_name) : dash}</dd>
          <dt>{t("run.attempts")}</dt>
          <dd>{t("common.of", { n: f.int(run.attempts), total: f.int(run.max_attempts) })}</dd>
          <dt>{t("run.created")}</dt>
          <dd>{f.dateTime(run.created_at)}</dd>
          <dt>{t("run.started")}</dt>
          <dd>{run.started_at ? f.dateTime(run.started_at) : dash}</dd>
          <dt>{t("run.finished")}</dt>
          <dd>{run.finished_at ? f.dateTime(run.finished_at) : dash}</dd>
          <dt>{t("run.lease")}</dt>
          <dd>{run.lease_until ? f.dateTime(run.lease_until) : dash}</dd>
          <dt>{t("run.step")}</dt>
          <dd className="sa-code">{run.current_step ?? dash}</dd>
          <dt>{t("run.error")}</dt>
          <dd>{run.error_message || run.error_code ? <span className="sa-code">{[run.error_code, run.error_message].filter(Boolean).join(": ")}</span> : dash}</dd>
        </dl>
      </Card>

      <Card id="run-passos" title={t("run.steps")} flush>
        <DataTable<Step>
          caption={t("run.steps")}
          rows={steps}
          rowKey={(s) => String(s.seq)}
          empty={t("run.stepsEmpty")}
          columns={[
            { key: "seq", label: t("run.colSeq"), align: "r", cell: (s) => <span className="sa-num">{s.seq}</span> },
            { key: "kind", label: t("run.colKind"), nowrap: true, cell: (s) => <span className="sa-code">{s.kind}</span> },
            { key: "step", label: t("run.colStep"), nowrap: true, cell: (s) => <span className="sa-code">{s.step ?? dash}</span> },
            { key: "model", label: t("run.colModel"), nowrap: true, cell: (s) => <span className="sa-code">{s.model ?? dash}</span> },
            { key: "status", label: t("run.colStatus"), nowrap: true, cell: (s) => <span className="sa-code">{s.status}</span> },
            { key: "tokens", label: t("run.colTokens"), nowrap: true, cell: (s) => <span className="sa-num">{tokens(s)}</span> },
            { key: "cost", label: t("run.colCost"), align: "r", nowrap: true, cell: (s) => (s.cost_usd ? <span className="sa-num">{f.usd(s.cost_usd, 4)}</span> : dash) },
            { key: "latency", label: t("run.colLatency"), align: "r", nowrap: true, cell: (s) => (s.latency_ms !== null ? `${f.int(s.latency_ms)} ms` : dash) },
            { key: "when", label: t("run.colWhen"), nowrap: true, cell: (s) => f.dateTime(s.created_at) },
          ]}
        />
      </Card>

      <Card id="run-eventos" title={t("run.events")} flush>
        <DataTable<Event>
          caption={t("run.events")}
          rows={events}
          rowKey={(e) => String(e.seq)}
          empty={t("run.eventsEmpty")}
          columns={[
            { key: "seq", label: t("run.colSeq"), align: "r", cell: (e) => <span className="sa-num">{e.seq}</span> },
            { key: "type", label: t("run.colType"), nowrap: true, cell: (e) => <span className="sa-code">{e.type}</span> },
            {
              key: "payload",
              label: t("run.colPayload"),
              cell: (e) => {
                const text = JSON.stringify(e.payload ?? {});
                return text && text !== "{}" ? (
                  <span className="sa-code sa-trunc" title={text}>
                    {text}
                  </span>
                ) : (
                  dash
                );
              },
            },
            { key: "when", label: t("run.colWhen"), nowrap: true, cell: (e) => f.dateTime(e.created_at) },
          ]}
        />
      </Card>
    </AdminPage>
  );
}
