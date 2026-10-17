import { unwrap } from "@hellosquad/contracts";
import { Agent, isAgentId } from "@hellosquad/ui";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPage } from "@/components/admin/AdminPage";
import { ApiProblem, Card, DataTable, Metrics, Note, Status } from "@/components/admin/ui";
import { adminRead, type SquadAgentSummary } from "@/lib/admin";
import { adminFormat } from "@/lib/admin-format";
import { codeLabel } from "@/lib/admin-labels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.squad");
  return { title: t("title") };
}

/**
 * Squad (SA0 `squad.html` → `GET /admin/squad`): os sete agentes com cor, forma, papel, modelo e esforço padrão,
 * deliveries (e quantas têm skill escrita), versão da Alma e do agent.yaml, rascunhos esperando publicação e custo
 * médio por run em 30 dias (vazio honesto sem run). Abrir o agente leva às quatro abas.
 */
export default async function SquadPage() {
  const [t, locale] = await Promise.all([getTranslations("admin"), getLocale()]);
  const f = adminFormat(locale);
  const result = await adminRead((api) => unwrap(api.GET("/admin/squad")), "/admin/squad");
  if (!result.ok) {
    return (
      <AdminPage nav="squad" title={t("squad.title")} desc={t("squad.desc")} versioned>
        <ApiProblem label={t("common.apiDown")} message={result.error.message} />
      </AdminPage>
    );
  }
  const { agents } = result.data;
  const deliveries = agents.reduce((n, a) => n + a.deliveries, 0);
  const skills = agents.reduce((n, a) => n + a.skills_written, 0);
  const runs = agents.reduce((n, a) => n + a.runs_30d, 0);
  const drafts = agents.reduce((n, a) => n + a.pending_drafts, 0);
  const model = (code: string | null) => codeLabel(t, "model", code);

  return (
    <AdminPage nav="squad" title={t("squad.title")} desc={t("squad.desc")} versioned>
      <section className="sa-grp sq-stage" aria-label={t("squad.stageLabel")}>
        <ul className="sq-stage-l">
          {agents.map((a) => (
            <li key={a.id}>
              {isAgentId(a.id) ? <Agent agent={a.id} size={72} title={a.name} /> : null}
              <a className="sa-rowlink" href={`/admin/squad/${a.id}`}>
                {a.name}
              </a>
              <small>{a.role ?? ""}</small>
            </li>
          ))}
        </ul>
      </section>
      <Metrics
        items={[
          { label: t("squad.metAgents"), value: f.int(agents.length), detail: t("squad.metAgentsSub") },
          { label: t("squad.metDeliveries"), value: f.int(deliveries), detail: t("squad.metDeliveriesSub", { n: skills }) },
          { label: t("squad.metRuns"), value: f.int(runs), detail: t("squad.metRunsSub") },
          {
            label: t("squad.metDrafts"),
            value: f.int(drafts),
            kind: drafts ? "you" : undefined,
            detail: drafts ? t("squad.metDraftsSome") : t("squad.metDraftsNone"),
          },
        ]}
      />
      <Card id="sq-sete" title={t("squad.tableTitle")} sub={t("squad.tableSub")} flush>
        <DataTable<SquadAgentSummary>
          caption={t("squad.tableTitle")}
          rows={agents}
          rowKey={(a) => a.id}
          empty={t("common.empty")}
          columns={[
            {
              key: "agent",
              label: t("squad.colAgent"),
              cell: (a) => (
                <div className="sa-cell-a">
                  {isAgentId(a.id) ? <Agent agent={a.id} size={34} /> : null}
                  <div className="sa-cell-m">
                    <a className="sa-rowlink" href={`/admin/squad/${a.id}`}>
                      {a.name}
                    </a>
                    <small>{a.role_full ?? a.role ?? ""}</small>
                  </div>
                </div>
              ),
            },
            {
              key: "color",
              label: t("squad.colColor"),
              nowrap: true,
              cell: (a) => (
                <span className="sq-swatch-w">
                  <span className="sq-swatch" aria-hidden="true" style={{ background: a.color ?? undefined }} />
                  <span className="sa-cell-m">
                    <span className="sa-mono">{(a.color ?? t("common.dash")).toUpperCase()}</span>
                    <small className="sa-mono">{t("squad.shape", { shape: a.shape ?? t("common.dash") })}</small>
                  </span>
                </span>
              ),
            },
            {
              key: "model",
              label: t("squad.colModel"),
              cell: (a) => (
                <div className="sa-cell-m">
                  <span>{model(a.default_model)}</span>
                  <small>{t("squad.effort", { effort: codeLabel(t, "effort", a.effort) })}</small>
                </div>
              ),
            },
            {
              key: "deliveries",
              label: t("squad.colDeliveries"),
              align: "r",
              cell: (a) => (
                <div className="sa-cell-m is-r">
                  <b className="sa-num">{f.int(a.deliveries)}</b>
                  <small>{a.skills_written ? t("squad.withSkill", { n: a.skills_written }) : t("squad.noSkill")}</small>
                </div>
              ),
            },
            {
              key: "prompt",
              label: t("squad.colPrompt"),
              nowrap: true,
              cell: (a) => (
                <div className="sa-cell-m">
                  <span className="sa-mono">
                    {t("squad.versions", {
                      soul: a.soul_version ?? t("common.dash"),
                      config: a.config_version ?? t("common.dash"),
                    })}
                  </span>
                  {a.pending_drafts ? (
                    <Status kind="draft" small>
                      {t("squad.drafts", { n: a.pending_drafts })}
                    </Status>
                  ) : (
                    <small className="sa-mono">
                      {a.last_prompt_hash ? t("squad.lastHash", { hash: a.last_prompt_hash.slice(0, 12) }) : t("squad.noRun")}
                    </small>
                  )}
                </div>
              ),
            },
            {
              key: "cost",
              label: t("squad.colCost"),
              align: "r",
              cell: (a) =>
                a.avg_cost_usd_30d === null ? (
                  <small className="sa-mut">{t("squad.noCost")}</small>
                ) : (
                  <div className="sa-cell-m is-r">
                    <b className="sa-num">{f.usd(a.avg_cost_usd_30d, 4)}</b>
                    <small>{t("squad.runs30", { n: a.runs_30d })}</small>
                  </div>
                ),
            },
          ]}
        />
      </Card>
      <Note label={t("squad.ruleLabel")}>{t("squad.rule")}</Note>
    </AdminPage>
  );
}
