import { COORDINATED_DELIVERY, type RequestDelivery } from "@/lib/delivery-types";

/**
 * Pedido que vira trabalho (A1a). O pedido escolhe a entrega por palavra, como o protótipo escolhe o especialista
 * (`GKEYS`, L5876: "legenda" e "texto" são do Otto). O resto fica só como mensagem: o squad não finge resposta (a
 * classificação de qualquer mensagem pelo Nexo é pendência da S1c, §7 item 7).
 *
 * Campanha (V4.6 jornada 2, FLUXOS §3.2; A2d): na Sala do Squad e na conversa com o Nexo, o pedido de campanha vira o
 * projeto coordenado 01.02 (S2d): o Nexo monta a equipe, as etapas e o projeto. As palavras cobrem os três idiomas
 * do produto (pt-BR, en, es), porque a pessoa escreve no idioma dela.
 */
const DELIVERIES: Array<{ type: RequestDelivery; words: RegExp; coordinator?: true }> = [
  { type: COORDINATED_DELIVERY, words: /\b(campanhas?|campaigns?|campañas?)(?![\p{L}])/iu, coordinator: true },
  { type: "04.01", words: /\b(legendas?|textos?)\b/i },
];

/**
 * A entrega do pedido, ou null quando ele fica só como mensagem. `coordinator`: a conversa é a Sala do Squad ou a do
 * Nexo, onde o pedido de campanha monta o projeto; nas outras conversas, campanha não vira trabalho de ninguém.
 */
export function deliveryForRequest(text: string, opts: { coordinator?: boolean } = {}): RequestDelivery | null {
  return DELIVERIES.find((d) => (!d.coordinator || opts.coordinator) && d.words.test(text))?.type ?? null;
}

/** Título do trabalho: a primeira frase do pedido, até 80 caracteres (o trabalho guarda até 200). */
export function workTitleFrom(body: string): string {
  const text = body.trim().replace(/\s+/g, " ");
  const sentence = text.split(/(?<=[.!?])\s/)[0] ?? text;
  const clean = sentence.replace(/[.!?]+$/, "");
  return clean.length > 80 ? clean.slice(0, 79) + "…" : clean;
}
