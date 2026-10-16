import { siteUrl } from "@/lib/env";
import { llmsText } from "@/lib/site-crawl";

// llms.txt da N2a (docs/conteudo/site/llms.txt, copiado por scripts/site-content.mjs): descrição citável do produto e
// dos sete agentes em pt-BR, en e es, com links absolutos.
export const dynamic = "force-static";

export function GET() {
  return new Response(llmsText(siteUrl()), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
