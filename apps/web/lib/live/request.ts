/**
 * Pedido que vira trabalho (A1a). O runtime da Fase 1 executa uma entrega: a 04.01 do Otto ("Textos e legendas de
 * marketing", S1c). O pedido escolhe a entrega por palavra, como o protótipo escolhe o especialista (`GKEYS`, L5876:
 * "legenda" e "texto" são do Otto). O resto fica só como mensagem: o squad não finge resposta (a classificação de
 * qualquer mensagem pelo Nexo é pendência da S1c, §7 item 7).
 */
const DELIVERIES: Array<{ type: string; words: RegExp }> = [{ type: "04.01", words: /\b(legendas?|textos?)\b/i }];

export function deliveryForRequest(text: string): string | null {
  return DELIVERIES.find((d) => d.words.test(text))?.type ?? null;
}

/** Título do trabalho: a primeira frase do pedido, até 80 caracteres (o trabalho guarda até 200). */
export function workTitleFrom(body: string): string {
  const text = body.trim().replace(/\s+/g, " ");
  const sentence = text.split(/(?<=[.!?])\s/)[0] ?? text;
  const clean = sentence.replace(/[.!?]+$/, "");
  return clean.length > 80 ? clean.slice(0, 79) + "…" : clean;
}
