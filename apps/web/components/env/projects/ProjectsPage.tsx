import { isApiError, unwrap, type components } from "@hellosquad/contracts";
import { isAgentId, type AgentId } from "@hellosquad/ui";
import { getLocale } from "next-intl/server";
import { TIME_ZONE } from "@/i18n/config";
import { serverApi } from "@/lib/api";
import { loadWorkspaceCore } from "@/lib/core";
import { workItemHref } from "@/lib/needs";
import type { EnvPageProps } from "../env-page";
import type { BoardWork } from "./board";
import { ProjectsView, type ProjectRow } from "./ProjectsView";

type Project = components["schemas"]["Project"];

/** Projetos do workspace (só GET). Sem resposta da API, a página mostra o vazio honesto, nunca dado inventado. */
async function loadProjects(workspaceId: string): Promise<Project[]> {
  try {
    const api = await serverApi();
    const page = await unwrap(api.GET("/workspaces/{workspace_id}/projects", { params: { path: { workspace_id: workspaceId }, query: { limit: 100 } } }));
    return page.items;
  } catch (error) {
    if (!isApiError(error)) throw error;
    return [];
  }
}

const agentOf = (id: string, fallback: AgentId = "nexo"): AgentId => (isAgentId(id) ? id : fallback);

/** O trabalho aberto daqui volta para Projetos (V4.6 `_openWork`: o voltar leva ao ambiente de origem). */
const toProjects = (href: string) => href.replace(/\/squad\/[a-z]+\/trabalho\//, "/squad/nexo/trabalho/");

/** Projetos · Nexo (A1b): roadmap, quem está trabalhando, próximos marcos e Todos os trabalhos. */
export async function ProjectsPage({ workspace, needs }: EnvPageProps) {
  const [core, projects, locale] = await Promise.all([loadWorkspaceCore(workspace.id), loadProjects(workspace.id), getLocale()]);
  const dm = new Intl.DateTimeFormat(locale, { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit" });
  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const approvals = new Map(core.approvals.map((a) => [a.id, a]));
  const strip = needs.map((n) => ({ ...n, href: toProjects(n.href) }));

  const works: BoardWork[] = core.workItems.map((w) => {
    const href = workItemHref(workspace.slug, "nexo", w.id);
    const need = strip.find((n) => n.href.endsWith(`/trabalho/${w.id}`));
    const approval = need ? approvals.get(need.approvalId) : undefined;
    return {
      id: w.id,
      title: w.title,
      status: w.status,
      lead: agentOf(w.primary_agent_id),
      co: w.collaborator_agent_ids.filter(isAgentId),
      project: w.project_id ? (projectName.get(w.project_id) ?? null) : null,
      href,
      need: need
        ? {
            cta: need.cta,
            title: need.title,
            href,
            version: approval?.delivery_version_no ?? null,
            due: approval?.due_at ? dm.format(new Date(approval.due_at)) : null,
          }
        : null,
    };
  });

  const rows: ProjectRow[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    objective: p.objective,
    status: p.status,
    lead: agentOf(p.owner_agent_id),
    works: core.workItems
      .filter((w) => w.project_id === p.id)
      .map((w) => ({ id: w.id, title: w.title, agent: agentOf(w.primary_agent_id), href: workItemHref(workspace.slug, "nexo", w.id) })),
  }));

  return <ProjectsView data={{ business: workspace.name, needs: strip, projects: rows, works }} />;
}
