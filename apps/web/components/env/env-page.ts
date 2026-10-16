import type { StripNeed } from "./NeedsStrip";

/** O que a rota de um ambiente do squad passa à página do especialista (servidor). */
export type EnvPageProps = {
  workspace: { id: string; slug: string; name: string };
  /** Faixa "Precisa de você" do ambiente (V4.6: Projetos vê todas; os demais, as do especialista). */
  needs: StripNeed[];
};
