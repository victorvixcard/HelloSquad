import { AgentEnvironment } from "../AgentEnvironment";
import type { EnvPageProps } from "../env-page";

/** Projetos · Nexo: roadmap e Todos os trabalhos (Quadro, Lista, Biblioteca) (A1b). */
export async function ProjectsPage({ workspace, needs }: EnvPageProps) {
  return <AgentEnvironment agent="nexo" business={workspace.name} needs={needs} />;
}
