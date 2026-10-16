import { AgentEnvironment } from "../AgentEnvironment";
import type { EnvPageProps } from "../env-page";

/** CRM · Max: Central de relacionamento com o vazio honesto da V4.6 (A1b). */
export async function CrmPage({ workspace, needs }: EnvPageProps) {
  return <AgentEnvironment agent="max" business={workspace.name} needs={needs} />;
}
