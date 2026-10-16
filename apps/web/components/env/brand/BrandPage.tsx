import { loadWorkspaceCore } from "@/lib/core";
import type { EnvPageProps } from "../env-page";
import { BrandEnvironment, type KaiaWork } from "./BrandEnvironment";

/** Marca & Criação · Kaia: estúdio (Bancada da Kaia e Criações) com o vazio honesto (A1b). */
export async function BrandPage({ workspace, needs }: EnvPageProps) {
  // Mesma leitura da casca (cache por requisição): "Em produção" conta só o que a Kaia tem em andamento de verdade.
  const core = await loadWorkspaceCore(workspace.id);
  const production: KaiaWork[] = core.workItems
    .filter((w) => w.status === "in_progress" && (w.primary_agent_id === "kaia" || w.collaborator_agent_ids.includes("kaia")))
    .map((w) => ({
      id: w.id,
      title: w.title,
      single: w.project_id === null,
      href: `/app/${workspace.slug}/squad/${w.primary_agent_id}/trabalho/${w.id}`,
    }));
  return <BrandEnvironment business={workspace.name} needs={needs} production={production} />;
}
