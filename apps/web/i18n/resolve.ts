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
 * Cookie com o idioma do negócio aberto por último (`<slug>:<idioma>`), para o middleware não perguntar à API a cada
 * tela. Só vale para o mesmo slug; mexer nele muda só o idioma da tela de quem mexeu, nunca o acesso.
 */
export const WORKSPACE_LOCALE_COOKIE = "hs_ws_locale";

/** Validade do cookie: quem não escolheu o próprio idioma vê a troca do idioma do negócio em até 5 minutos. */
export const WORKSPACE_LOCALE_MAX_AGE_S = 5 * 60;

/** Rota da área logada que não é um negócio (`/app/novo-workspace`). */
const NON_WORKSPACE_SEGMENTS = new Set(["novo-workspace"]);

/** Slug do negócio na rota da área logada (`/app/<slug>` e abaixo); `/app` e `/app/novo-workspace` não têm. */
export function workspaceSlugOf(pathname: string): string | null {
  const segment = /^\/app\/([^/]+)/.exec(pathname)?.[1];
  return segment && !NON_WORKSPACE_SEGMENTS.has(segment) ? segment : null;
}

/** Idioma do negócio guardado no cookie, se o cookie for do mesmo slug. */
export function workspaceLocaleFromCookie(value: string | undefined, slug: string): Locale | null {
  if (!value) return null;
  const at = value.lastIndexOf(":");
  if (at < 0 || value.slice(0, at) !== slug) return null;
  const locale = value.slice(at + 1);
  return isLocale(locale) ? locale : null;
}

/**
 * Idioma da tela na área logada (ADR-0010, H2-04): a escolha da pessoa vence; sem ela, o do negócio da rota, lido do
 * cookie do mesmo slug ou, sem cookie, da API (`GET /me`, `memberships[].workspace.locale`); por fim pt-BR. Quando o
 * idioma do negócio veio da API, `cookie` traz o valor a guardar; falha da API cai no pt-BR, sem cookie.
 */
export async function resolveRequestLocale(input: {
  user: unknown;
  pathname: string;
  cookie: string | undefined;
  workspaceLocale: (slug: string) => Promise<unknown>;
}): Promise<{ locale: Locale; source: LocaleSource; cookie: string | null }> {
  const slug = workspaceSlugOf(input.pathname);
  if (isLocale(input.user) || !slug) return { ...resolveLocale({ user: input.user }), cookie: null };
  const cached = workspaceLocaleFromCookie(input.cookie, slug);
  if (cached) return { ...resolveLocale({ workspace: cached }), cookie: null };
  const fetched = await input.workspaceLocale(slug).catch(() => null);
  const resolved = resolveLocale({ workspace: fetched });
  return { ...resolved, cookie: resolved.source === "workspace" ? `${slug}:${resolved.locale}` : null };
}

/**
 * Cabeçalho da requisição de onde o next-intl lê o idioma (`requestLocale`). Só o middleware grava; o que vier do
 * browser é apagado antes.
 */
export const LOCALE_HEADER = "X-NEXT-INTL-LOCALE";

/** Rotas públicas por idioma (ADR-0010): `/` é pt-BR, `/en` e `/es` as traduções, com `hreflang` entre elas. */
export const PUBLIC_LOCALE_PATHS: Record<Locale, string> = { "pt-BR": "/", en: "/en", es: "/es" };

/**
 * Idioma do site público pelo prefixo da rota (A2c): `/en` e `/en/...` são en, `/es` e `/es/...` são es. O pt-BR fica
 * na raiz, sem prefixo, e não passa por aqui (as páginas dele são estáticas).
 */
export function publicLocaleOf(pathname: string): Locale | null {
  const hit = (Object.entries(PUBLIC_LOCALE_PATHS) as [Locale, string][]).find(
    ([locale, path]) => locale !== DEFAULT_LOCALE && (pathname === path || pathname.startsWith(`${path}/`)),
  );
  return hit ? hit[0] : null;
}
