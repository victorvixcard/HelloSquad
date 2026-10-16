import { loadContactSummaryAction } from "@/app/app/[workspace]/crm-actions";
import { loadMe } from "@/lib/api";
import { loadWorkspaceCore } from "@/lib/core";
import type { EnvPageProps } from "../env-page";
import { list, num, obj, str, workState, worksWithContent } from "../growth/work-content";
import { CrmEnvironment } from "./CrmEnvironment";
import type { CrmCampaign, CrmSegments } from "./crm-types";

/**
 * CRM · Max (A2b): a Central de relacionamento com a base real (resumo de contatos da API), a importação de CSV,
 * os segmentos do último 06.03 e as campanhas e sequências (06.01 e 06.02). Sem contatos, o vazio da A1b.
 */
export async function CrmPage({ workspace, needs }: EnvPageProps) {
  const [core, me, summary] = await Promise.all([loadWorkspaceCore(workspace.id), loadMe(), loadContactSummaryAction(workspace.id)]);
  const role = me.ok ? me.me.memberships.find((m) => m.workspace.id === workspace.id)?.role : undefined;
  const canImport = role === "owner" || role === "admin";
  const href = (id: string) => `/app/${workspace.slug}/squad/max/trabalho/${id}`;

  const [segWork] = await worksWithContent(core.workItems, ["06.03"], 1);
  let segments: CrmSegments | null = null;
  if (segWork?.version) {
    const c = segWork.version.content;
    const base = obj(c.base);
    segments = {
      workItemId: segWork.work.id,
      title: str(c.titulo) || segWork.work.title,
      versionNo: segWork.version.no,
      origins: list(base.origens).map((o) => str(obj(o).origem)).filter(Boolean),
      segments: list(c.segmentos).map((s) => {
        const ok = obj(s.elegiveis);
        return {
          id: str(s.id),
          name: str(s.nome),
          description: str(s.descricao),
          use: str(s.uso_sugerido),
          size: num(s.tamanho),
          email: num(ok.email),
          wa: num(ok.whatsapp),
        };
      }),
    };
  }
  const names = new Map((segments?.segments ?? []).map((s) => [s.id, s.name]));

  const camps = await worksWithContent(core.workItems, ["06.01", "06.02"]);
  const campaigns: CrmCampaign[] = camps.map(({ work, version }) => {
    const c = version?.content ?? {};
    const isSeq = work.delivery_type === "06.02";
    const segId = isSeq ? str(c.segmento) : str(obj(c.segmento).id);
    const rows = isSeq ? list(c.etapas) : list(c.calendario);
    return {
      id: work.id,
      type: isSeq ? "06.02" : "06.01",
      title: str(c.titulo) || work.title,
      state: workState(work.status),
      goal: isSeq ? str(c.objetivo) : str(obj(c.objetivo).objetivo),
      segment: segId ? (names.get(segId) ?? segId) : null,
      channels: [...new Set(rows.map((r) => str(r.canal)).filter(Boolean))],
      steps: isSeq ? rows.length : null,
      next: work.next_step ?? null,
      href: href(work.id),
    };
  });

  return (
    <CrmEnvironment
      business={workspace.name}
      needs={needs}
      summary={summary.ok ? summary.data : null}
      canImport={canImport}
      segments={segments}
      campaigns={campaigns}
    />
  );
}
