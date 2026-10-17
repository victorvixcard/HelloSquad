/** Grupos de código que a API manda e o painel rotula pelo catálogo (`admin.codes.<grupo>.<código>`). */
export type CodeGroup =
  | "accountStatus"
  | "locale"
  | "role"
  | "ledger"
  | "depth"
  | "homologation"
  | "cycle"
  | "provider"
  | "providerStatus"
  | "secret"
  | "method"
  | "subscription"
  | "payment"
  | "paymentKind"
  | "webhookOutcome"
  | "actor"
  | "category"
  | "run"
  | "runKind"
  | "queue"
  | "effort"
  | "task";

type Translator = { (key: never): string; has(key: never): boolean };

/**
 * Rótulo de um código da API no idioma da tela. Código sem rótulo no catálogo aparece como veio (nunca some nem vira
 * outro); vazio vira "—".
 */
export function codeLabel(t: Translator, group: CodeGroup, code: string | null | undefined, dash = "—"): string {
  if (code === null || code === undefined || code === "") return dash;
  const key = `codes.${group}.${code}` as never;
  return t.has(key) ? t(key) : code;
}

/** Primeiro valor de um parâmetro da URL (`?q=a&q=b` vale "a"); vazio = ausente. */
export function one(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.trim() ? v.trim() : undefined;
}

/** Endereço do painel com os parâmetros que têm valor. */
export function hrefWith(path: string, params: Record<string, string | null | undefined>): string {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) query.set(k, v);
  const s = query.toString();
  return s ? `${path}?${s}` : path;
}
