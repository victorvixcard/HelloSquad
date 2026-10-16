import { AgentEnvironment } from "../AgentEnvironment";
import type { EnvPageProps } from "../env-page";

/** Marca & Criação · Kaia: estúdio (Bancada da Kaia e Criações) com o vazio honesto (A1b). */
export async function BrandPage({ workspace, needs }: EnvPageProps) {
  return <AgentEnvironment agent="kaia" business={workspace.name} needs={needs} />;
}
