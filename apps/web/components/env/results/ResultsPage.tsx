import type { EnvPageProps } from "../env-page";
import { ResultsEnvironment } from "./ResultsEnvironment";

/** Resultados · Íris: o vazio honesto da V4.6 até existir dado real (A1b). */
export async function ResultsPage({ workspace, needs }: EnvPageProps) {
  return <ResultsEnvironment business={workspace.name} needs={needs} />;
}
