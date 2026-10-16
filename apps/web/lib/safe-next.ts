/**
 * Destino depois do login, só se for um caminho interno da área logada (/app, /app/...).
 * Evita redirecionamento aberto (?next=https://site-de-terceiro ou //site).
 */
export function safeNext(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!/^\/app(?:[/?#]|$)/.test(value)) return null;
  if (value.includes("\\") || value.includes("//")) return null;
  return value;
}
