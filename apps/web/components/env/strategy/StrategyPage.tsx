import { loadWorkItem, loadWorkspaceCore, type WorkItemDetail } from "@/lib/core";
import type { EnvPageProps } from "../env-page";
import { StrategyEnvironment } from "./StrategyEnvironment";
import { buildStrategyData, isStrategyType } from "./strategy-data";

/**
 * Estratégia · Bia (A2b): os trabalhos da Bia vêm da lista do workspace e, para os documentos (02.01, 02.02, 02.03,
 * 02.04 e 02.07), o detalhe de cada um traz as versões e as aprovações. Sem nenhum trabalho, a tela continua no
 * primeiro acesso da V4.6.
 */
export async function StrategyPage({ workspace, needs }: EnvPageProps) {
  const core = await loadWorkspaceCore(workspace.id);
  const bia = core.workItems.filter((w) => w.primary_agent_id === "bia" && w.status !== "cancelled");
  const details = await Promise.all(bia.filter((w) => isStrategyType(w.delivery_type)).map((w) => loadWorkItem(w.id).catch(() => null)));
  const data = buildStrategyData(bia, details.filter((d): d is WorkItemDetail => !!d));
  return <StrategyEnvironment business={workspace.name} needs={needs} data={data} />;
}
