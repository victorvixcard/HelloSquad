import { unwrap } from "@hellosquad/contracts";
import { serverApi } from "@/lib/api";
import { loadWorkItem, loadWorkspaceCore } from "@/lib/core";
import type { EnvPageProps } from "../env-page";
import type { MetricSeries } from "./metrics";
import { type IrisAnalysis, ResultsEnvironment } from "./ResultsEnvironment";

const ANALYSIS_TYPES = new Set(["07.02", "07.03", "07.04"]);
/** Janela pedida à API: 180 dias cobrem o trimestre e o trimestre anterior (o limite da API é 366). */
const WINDOW_DAYS = 180;

async function loadSeries(workspaceId: string): Promise<MetricSeries[]> {
  const to = new Date();
  const from = new Date(to.getTime() - WINDOW_DAYS * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  try {
    const api = await serverApi();
    const page = await unwrap(
      api.GET("/workspaces/{workspace_id}/metrics", { params: { path: { workspace_id: workspaceId }, query: { from: iso(from), to: iso(to) } } }),
    );
    return page.items.filter((s) => s.points.length > 0);
  } catch {
    // Sem resposta da API, a tela fica no vazio honesto: nenhum número é inventado.
    return [];
  }
}

/** Resultados · Íris: as séries de `metrics_daily` e os trabalhos 07.02, 07.03 e 07.04 da Íris ("Análises recentes"). */
export async function ResultsPage({ workspace, needs }: EnvPageProps) {
  const [series, core] = await Promise.all([loadSeries(workspace.id), loadWorkspaceCore(workspace.id)]);
  const recent = core.workItems
    .filter((w) => w.primary_agent_id === "iris" && w.delivery_type && ANALYSIS_TYPES.has(w.delivery_type))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 3);
  const analyses: IrisAnalysis[] = await Promise.all(
    recent.map(async (w) => {
      const detail = await loadWorkItem(w.id);
      const versions = detail?.deliveries[0]?.versions ?? [];
      const version = versions.length ? Math.max(...versions.map((v) => v.version_no)) : null;
      return {
        id: w.id,
        title: w.title,
        type: w.delivery_type as IrisAnalysis["type"],
        version,
        status: w.status,
        href: `/app/${workspace.slug}/squad/iris/trabalho/${w.id}`,
      };
    }),
  );
  return <ResultsEnvironment business={workspace.name} needs={needs} series={series} analyses={analyses} />;
}
