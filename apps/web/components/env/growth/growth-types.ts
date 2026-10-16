import type { WorkState } from "./work-content";

type KiwiBase = { id: string; title: string; state: WorkState; awaiting: boolean; href: string };

/** Plano de mídia (05.01): teto proposto, período, distribuição por canal e limites, como a Kiwi escreveu. */
export type KiwiPlan = KiwiBase & {
  kind: "plan";
  ceiling: number | null;
  period: string;
  split: Array<{ channel: string; value: number | null }>;
  limits: string[];
  goal: string;
  audience: string[];
};

/** Testes de anúncios (05.02): públicos e testes, um de cada vez, dentro do plano de mídia aprovado. */
export type KiwiTests = KiwiBase & {
  kind: "tests";
  audiences: string[];
  tests: Array<{ order: number | null; hypothesis: string; variable: string; duration: string; budget: number | null }>;
  plan: { no: number; ceiling: number | null } | null;
};

export type KiwiWork = KiwiPlan | KiwiTests;
