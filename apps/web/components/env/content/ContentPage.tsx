import { loadWorkspaceCore } from "@/lib/core";
import { ContentEnvironment } from "../ContentEnvironment";
import type { EnvPageProps } from "../env-page";
import { organicPerf } from "../results/metrics";
import { loadSeries } from "../results/series-loader";
import { initialWindow, todayIso, type CalendarData } from "./calendar";
import { loadCalendarAction } from "./calendar-actions";

/**
 * Conteúdo · Otto (A2b): o calendário editorial lê os posts da API (a pauta que o Otto propõe numa 04.02 e que vira
 * pauta aprovada quando o dono aprova a versão). Sem post, o vazio da V4.6 da A1f. O "Desempenho orgânico" lê as
 * séries de `GET /metrics` (H2-09): só os dois números da semana vão para a tela.
 */
export async function ContentPage({ workspace, needs }: EnvPageProps) {
  const today = todayIso(new Date());
  const { from, to } = initialWindow(today);
  const [core, read, series] = await Promise.all([loadWorkspaceCore(workspace.id), loadCalendarAction(workspace.id, from, to), loadSeries(workspace.id)]);
  const versions: CalendarData["versions"] = {};
  for (const a of core.approvals) {
    if (a.status === "pending" && a.delivery_version_id && a.delivery_version_no != null) {
      versions[a.delivery_version_id] = { no: a.delivery_version_no, approvalId: a.id };
    }
  }
  const works: CalendarData["works"] = {};
  for (const w of core.workItems) works[w.id] = w.title;
  const calendar: CalendarData = { ok: read.ok, today, from, to, items: read.ok ? read.items : [], versions, works };
  return <ContentEnvironment business={workspace.name} needs={needs} calendar={calendar} perf={organicPerf(series)} />;
}
