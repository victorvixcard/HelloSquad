import type { Locale } from "@/i18n/config";
import type { SitePageKey } from "./site-routes";

// Texto do site público, gerado de docs/conteudo/site/<idioma>/*.md (N2a) por scripts/site-content.mjs. Fica fora do
// catálogo de mensagens porque o catálogo vai inteiro para o browser em toda tela; este só é lido no servidor.

export type SiteBlock =
  | { type: "p"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "qa"; question: string; answer: SiteBlock[] };

export type SiteSectionContent = { id: string; title: string; blocks: SiteBlock[] };

export type SiteAgentMeta = { nome: string; area: string; papel: string; cor: string; artigo?: string; pronome?: string };

export type SitePageContent = {
  key: SitePageKey;
  path: string;
  title: string;
  description: string;
  agent?: SiteAgentMeta;
  h1?: string;
  tagline?: string;
  intro?: SiteBlock[];
  sections?: SiteSectionContent[];
  cta?: boolean;
};

export type SiteContent = { locale: Locale; source: string; pages: Record<SitePageKey, SitePageContent> };

const LOADERS: Record<Locale, () => Promise<{ default: unknown }>> = {
  "pt-BR": () => import("@/content/site/pt-BR.json"),
  en: () => import("@/content/site/en.json"),
  es: () => import("@/content/site/es.json"),
};

export async function getSiteContent(locale: Locale): Promise<SiteContent> {
  return (await LOADERS[locale]()).default as SiteContent;
}

export async function getSitePage(locale: Locale, key: SitePageKey): Promise<SitePageContent> {
  const page = (await getSiteContent(locale)).pages[key];
  if (!page) throw new Error(`Página do site sem conteúdo: ${locale}/${key}`);
  return page;
}

/** Todas as perguntas de uma página, na ordem (a FAQ inteira, ou as do fim da página de um agente). */
export function questionsOf(page: SitePageContent): Extract<SiteBlock, { type: "qa" }>[] {
  return (page.sections ?? []).flatMap((section) =>
    section.blocks.filter((block): block is Extract<SiteBlock, { type: "qa" }> => block.type === "qa"),
  );
}
