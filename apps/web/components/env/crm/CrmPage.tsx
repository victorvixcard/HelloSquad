import type { EnvPageProps } from "../env-page";
import { CrmEnvironment } from "./CrmEnvironment";

/** CRM · Max: Central de relacionamento com o vazio honesto da V4.6 (A1b). */
export async function CrmPage({ workspace, needs }: EnvPageProps) {
  return <CrmEnvironment business={workspace.name} needs={needs} />;
}
