import type { EnvPageProps } from "../env-page";
import { StrategyEnvironment } from "./StrategyEnvironment";

/** Estratégia · Bia: visão protagonista e componentes com o vazio honesto da V4.6 (A1b). */
export async function StrategyPage({ workspace, needs }: EnvPageProps) {
  return <StrategyEnvironment business={workspace.name} needs={needs} />;
}
