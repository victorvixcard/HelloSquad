import { unwrap } from "@hellosquad/contracts";
import { serverApi } from "@/lib/api";
import type { MetricSeries } from "./metrics";

/** Janela pedida à API: 180 dias cobrem o trimestre e o trimestre anterior (o limite da API é 366). */
const WINDOW_DAYS = 180;

/** As séries de `metrics_daily` (`GET /metrics`), lidas no servidor por Resultados e pelo Conteúdo. */
export async function loadSeries(workspaceId: string): Promise<MetricSeries[]> {
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
