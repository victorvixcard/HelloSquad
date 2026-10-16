import type { AgentId } from "@hellosquad/ui";
import type { DeliveryType } from "./delivery-types";

/**
 * Catálogo "O que você quer fazer com <agente>?" (V4.2/V4.3 `CAPX_L` e `CAP_G`, L11337–11587, com os ajustes de
 * linguagem da V4.3 L11785 e da V4.4 L12230 e L12238). Os textos ficam no catálogo de mensagens (`caps`), pelo `id`.
 * `code` é a entrega que o squad executa para o pedido; sem código, o pedido ainda não tem entrega nesta versão.
 * A ordem e os grupos são os do protótipo.
 */
export type Capability = { id: string; group: number; code: DeliveryType | null };

export const CAPABILITIES: Record<AgentId, Capability[]> = {
  nexo: [
    { id: "n-proj", group: 0, code: null },
    { id: "n-camp", group: 0, code: "02.04" },
    { id: "n-dele", group: 0, code: null },
    { id: "n-acomp", group: 1, code: null },
    { id: "n-appr", group: 1, code: null },
  ],
  bia: [
    { id: "b-diag", group: 0, code: "02.01" },
    { id: "b-merc", group: 0, code: "02.07" },
    { id: "b-pos", group: 1, code: "02.02" },
    { id: "b-plan", group: 1, code: "02.03" },
    { id: "b-opp", group: 1, code: null },
  ],
  kaia: [
    { id: "k-id", group: 0, code: null },
    { id: "k-post", group: 1, code: null },
    { id: "k-car", group: 1, code: null },
    { id: "k-promo", group: 1, code: null },
    { id: "k-img", group: 2, code: null },
    { id: "k-vid", group: 2, code: null },
  ],
  otto: [
    { id: "o-plan", group: 0, code: "04.02" },
    { id: "o-cal", group: 0, code: "04.02" },
    { id: "o-post", group: 1, code: "04.03" },
    { id: "o-txt", group: 1, code: "04.01" },
    { id: "o-seo", group: 1, code: null },
    { id: "o-prog", group: 2, code: null },
  ],
  kiwi: [
    { id: "g-seo", group: 0, code: null },
    { id: "g-org", group: 0, code: null },
    { id: "g-paid", group: 1, code: "05.01" },
    { id: "g-ads", group: 1, code: null },
    { id: "g-aud", group: 1, code: "05.02" },
    { id: "g-cro", group: 2, code: null },
    { id: "g-test", group: 2, code: null },
  ],
  max: [
    { id: "m-pub", group: 0, code: "06.03" },
    { id: "m-seg", group: 0, code: "06.03" },
    { id: "m-camp", group: 1, code: "06.01" },
    { id: "m-jour", group: 1, code: null },
    { id: "m-flow", group: 1, code: "06.02" },
    { id: "m-reat", group: 2, code: "06.01" },
    { id: "m-lead", group: 2, code: null },
  ],
  iris: [
    { id: "i-ind", group: 0, code: "07.02" },
    { id: "i-cmp", group: 0, code: "07.03" },
    { id: "i-int", group: 0, code: "07.02" },
    { id: "i-rep", group: 1, code: "07.03" },
    { id: "i-inv", group: 1, code: "07.02" },
    { id: "i-opp", group: 1, code: "07.04" },
  ],
};

/** Chave do catálogo de mensagens para o id da capacidade ("b-diag" → "bDiag"): só letras, como as outras chaves. */
export function capabilityKey(id: string): string {
  return id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}
