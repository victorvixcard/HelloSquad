import { AGENT_IDS, type AgentId } from "@hellosquad/ui";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/config";

// Rotas do site público (docs/conteudo/site/README.md §2): pt-BR na raiz, en e es com prefixo e slug traduzido; o slug
// do agente é o mesmo nos três idiomas. `test/site-seo.test.ts` confere esta tabela contra a rota de cada arquivo da N2a.

export type SiteSection = "inicio" | "como-funciona" | "squad" | "faq" | "sobre";
export type SitePageKey = SiteSection | `squad-${AgentId}`;

const SECTION_PATHS: Record<SiteSection, Record<Locale, string>> = {
  inicio: { "pt-BR": "/", en: "/en", es: "/es" },
  "como-funciona": { "pt-BR": "/como-funciona", en: "/en/how-it-works", es: "/es/como-funciona" },
  squad: { "pt-BR": "/squad", en: "/en/squad", es: "/es/squad" },
  faq: { "pt-BR": "/faq", en: "/en/faq", es: "/es/preguntas-frecuentes" },
  sobre: { "pt-BR": "/sobre", en: "/en/about", es: "/es/sobre" },
};

export const SITE_SECTIONS = Object.keys(SECTION_PATHS) as SiteSection[];
export const AGENT_PAGE_KEYS = AGENT_IDS.map((id) => `squad-${id}` as const);
export const SITE_PAGE_KEYS: SitePageKey[] = [...SITE_SECTIONS, ...AGENT_PAGE_KEYS];

export function agentPageKey(id: AgentId): SitePageKey {
  return `squad-${id}`;
}

/** Agente de uma página `squad-<id>` (ou null). */
export function agentOf(key: SitePageKey): AgentId | null {
  return key.startsWith("squad-") ? (key.slice("squad-".length) as AgentId) : null;
}

/** Caminho de uma página num idioma, sem o domínio. */
export function sitePath(key: SitePageKey, locale: Locale): string {
  const agent = agentOf(key);
  if (agent) return `${SECTION_PATHS.squad[locale]}/${agent}`;
  return SECTION_PATHS[key as SiteSection][locale];
}

/** `hreflang` de uma página: as três versões e o `x-default` no pt-BR (P5 da N2a, enquanto o pt-BR for a principal). */
export function siteLanguages(key: SitePageKey): Record<Locale | "x-default", string> {
  const entries = LOCALES.map((locale) => [locale, sitePath(key, locale)] as const);
  return { ...Object.fromEntries(entries), "x-default": sitePath(key, DEFAULT_LOCALE) } as Record<
    Locale | "x-default",
    string
  >;
}

/** Página-mãe na trilha (migalhas): agente → squad → início; seção → início. */
export function siteParent(key: SitePageKey): SitePageKey | null {
  if (key === "inicio") return null;
  return agentOf(key) ? "squad" : "inicio";
}

export function siteTrail(key: SitePageKey): SitePageKey[] {
  const trail: SitePageKey[] = [];
  for (let at: SitePageKey | null = key; at; at = siteParent(at)) trail.unshift(at);
  return trail;
}
