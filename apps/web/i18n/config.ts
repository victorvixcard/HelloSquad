/**
 * Idiomas do HelloSquad (ADR-0010): pt-BR primeiro; en e es entram como tradução do mesmo catálogo,
 * sem refatorar componente. Nenhum texto de interface fica fixo em código: tudo vem de messages/<idioma>/.
 */
export const LOCALES = ["pt-BR", "en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pt-BR";

/** Fuso de referência das datas exibidas (o produto nasce no Brasil; por workspace quando houver). */
export const TIME_ZONE = "America/Sao_Paulo";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
