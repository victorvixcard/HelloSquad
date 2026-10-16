import llms from "@/content/site/llms.json";

// Texto do robots.txt e do llms.txt do site (N2a: docs/conteudo/site/robots.txt e llms.txt). As rotas só servem.

/** Bloqueados para todos os robôs: a área logada, a saída e o Super Admin (rota /admin, decisão do dono de 16/10). */
export const PRIVATE_PATHS = ["/app", "/app/", "/admin", "/admin/", "/sair"];

/** Assistentes de IA, nomeados para deixar a intenção escrita: os quatro do briefing e os de busca e leitura sob demanda. */
export const AI_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "Perplexity-User",
  "Applebot-Extended",
];

/**
 * Disallow antes de Allow: pela RFC 9309 vale a regra mais longa, mas há leitores que usam a primeira que casa (o
 * urllib.robotparser do Python), e com "Allow: /" primeiro eles liberariam /app. Por isso o texto é escrito aqui, e
 * não pela Metadata API do Next (que põe Allow antes de Disallow).
 */
export function robotsText(url: string): string {
  const rules = [...PRIVATE_PATHS.map((path) => `Disallow: ${path}`), "Allow: /"];
  return [
    "User-Agent: *",
    ...rules,
    "",
    ...AI_CRAWLERS.map((bot) => `User-Agent: ${bot}`),
    ...rules,
    "",
    `Sitemap: ${url}/sitemap.xml`,
    "",
  ].join("\n");
}

/** O llms.txt da N2a com os links relativos trocados pelo endereço do site. */
export function llmsText(url: string): string {
  return llms.text.replace(/\]\(\//g, `](${url}/`);
}
