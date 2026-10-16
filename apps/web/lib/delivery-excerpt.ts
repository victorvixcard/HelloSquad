/**
 * Primeiro texto de uma versão: a skill 04.01 do worker (`versoes[].texto`) ou o formato do seed (`legenda`); nos
 * documentos da A2b, o resumo (ou o título) que o agente escreveu.
 */
export function excerptOf(content: unknown): string {
  const c = (content ?? {}) as { legenda?: unknown; versoes?: unknown; resumo?: unknown; titulo?: unknown; tema?: unknown };
  if (typeof c.legenda === "string") return c.legenda;
  if (typeof c.resumo === "string") return c.resumo;
  const first = Array.isArray(c.versoes) ? (c.versoes[0] as { texto?: unknown } | undefined) : undefined;
  if (typeof first?.texto === "string") return first.texto;
  return typeof c.titulo === "string" ? c.titulo : typeof c.tema === "string" ? c.tema : "";
}
