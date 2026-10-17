import type { CatalogItem } from "@/lib/admin";

/**
 * Integrações necessárias como etiquetas, lidas por palavra-chave do texto do catálogo (como o `INTEG` do SA0
 * `catalogo.js`). As específicas vêm antes de LLM e Supabase (a base de quase todas), para o que trava a delivery
 * aparecer primeiro. O texto completo continua no `title` da célula.
 */
export const INTEGRATION_TAGS = [
  ["image", /imagem|motor visual/],
  ["video", /v[ií]deo/],
  ["meta", /\bmeta\b|instagram|facebook/],
  ["google", /google|ga4|search console|\bgbp\b/],
  ["email", /e-mail/],
  ["whatsapp", /whatsapp/],
  ["crm", /\bcrm\b|\bcsv\b/],
  ["web", /busca web|pesquisa web/],
  ["cms", /\bcms\b|blog/],
  ["llm", /\bllm\b/],
  ["supabase", /supabase|postgres|storage|cron|\brls\b/],
] as const satisfies readonly (readonly [string, RegExp])[];

export type IntegrationTag = (typeof INTEGRATION_TAGS)[number][0];

export function integrationTags(text: string | null | undefined): IntegrationTag[] {
  const lower = String(text ?? "").toLowerCase();
  return INTEGRATION_TAGS.filter(([, re]) => re.test(lower)).map(([id]) => id);
}

/** Ordem do resumo de homologação no cabeçalho do agente (a do SA0). */
export const HOMOLOGATION_ORDER = ["homologated", "in_homologation", "awaiting_engine", "awaiting_integration", "not_started"] as const;

export function homologationCounts(items: CatalogItem[]): { status: (typeof HOMOLOGATION_ORDER)[number]; n: number }[] {
  return HOMOLOGATION_ORDER.map((status) => ({ status, n: items.filter((d) => d.homologation_status === status).length })).filter((c) => c.n);
}

/**
 * Versão do catálogo: o que o catálogo versiona hoje é o preço (cada preço novo é uma linha em `delivery_prices`, e
 * `price.versions` conta as linhas de cada delivery). A versão 1 é o catálogo como foi semeado; cada preço novo gravado
 * soma uma. Homologação e "à venda" mudam no lugar, com a entrada na auditoria ("Ver histórico").
 */
export function catalogVersion(items: CatalogItem[]): number {
  return 1 + items.reduce((n, d) => n + Math.max((d.price?.versions ?? 0) - 1, 0), 0);
}
