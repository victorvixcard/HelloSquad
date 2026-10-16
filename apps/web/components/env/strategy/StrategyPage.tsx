import { AgentEnvironment } from "../AgentEnvironment";
import type { EnvPageProps } from "../env-page";

/** Estratégia · Bia: visão protagonista e componentes com o vazio honesto da V4.6 (A1b). */
export async function StrategyPage({ workspace, needs }: EnvPageProps) {
  return <AgentEnvironment agent="bia" business={workspace.name} needs={needs} />;
}
