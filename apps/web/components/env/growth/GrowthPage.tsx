import type { EnvPageProps } from "../env-page";
import { GrowthEnvironment } from "./GrowthEnvironment";

/** Growth Marketing · Kiwi: objetivo, frentes e o vazio honesto (A1b). */
export async function GrowthPage({ workspace, needs }: EnvPageProps) {
  return <GrowthEnvironment business={workspace.name} needs={needs} />;
}
