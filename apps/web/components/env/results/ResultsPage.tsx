import { AgentEnvironment } from "../AgentEnvironment";
import type { EnvPageProps } from "../env-page";

/** Resultados · Íris: o vazio honesto da V4.6 até existir dado real (A1b). */
export async function ResultsPage({ workspace, needs }: EnvPageProps) {
  return <AgentEnvironment agent="iris" business={workspace.name} needs={needs} />;
}
