import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";

/** De onde veio o idioma da tela. */
export type LocaleSource = "user" | "workspace" | "default";

/**
 * Ordem do ADR-0010: a escolha da pessoa vale primeiro, depois o idioma do negócio e, sem nenhum dos dois, pt-BR.
 * Valor fora de pt-BR, en e es é ignorado (cai no próximo).
 */
export function resolveLocale(input: { user?: unknown; workspace?: unknown }): { locale: Locale; source: LocaleSource } {
  if (isLocale(input.user)) return { locale: input.user, source: "user" };
  if (isLocale(input.workspace)) return { locale: input.workspace, source: "workspace" };
  return { locale: DEFAULT_LOCALE, source: "default" };
}

/** Idioma que a pessoa escolheu, guardado na conta da Auth (`user_metadata.locale`), lido das claims do token. */
export function userLocaleFromClaims(claims: unknown): Locale | null {
  if (!claims || typeof claims !== "object") return null;
  const meta = (claims as { user_metadata?: unknown }).user_metadata;
  if (!meta || typeof meta !== "object") return null;
  const locale = (meta as { locale?: unknown }).locale;
  return isLocale(locale) ? locale : null;
}

/**
 * Cabeçalho da requisição de onde o next-intl lê o idioma (`requestLocale`). Só o middleware grava; o que vier do
 * browser é apagado antes.
 */
export const LOCALE_HEADER = "X-NEXT-INTL-LOCALE";

/** Rotas públicas por idioma (ADR-0010): `/` é pt-BR, `/en` e `/es` as traduções, com `hreflang` entre elas. */
export const PUBLIC_LOCALE_PATHS: Record<Locale, string> = { "pt-BR": "/", en: "/en", es: "/es" };

export function publicLocaleOf(pathname: string): Locale | null {
  const hit = (Object.entries(PUBLIC_LOCALE_PATHS) as [Locale, string][]).find(([, path]) => path === pathname);
  return hit && hit[0] !== DEFAULT_LOCALE ? hit[0] : null;
}
