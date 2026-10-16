import { AgentEnvironment } from "../AgentEnvironment";
import type { EnvPageProps } from "../env-page";

/** Growth Marketing · Kiwi: objetivo, frentes e o vazio honesto (A1b). */
export async function GrowthPage({ workspace, needs }: EnvPageProps) {
  return <AgentEnvironment agent="kiwi" business={workspace.name} needs={needs} />;
}
