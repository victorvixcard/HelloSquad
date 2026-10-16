import { siteUrl } from "@/lib/env";
import { robotsText } from "@/lib/site-crawl";

// robots.txt do site (N2a): o público liberado; /app, /admin e /sair bloqueados para todos (lib/site-crawl.ts).
export const dynamic = "force-static";

export function GET() {
  return new Response(robotsText(siteUrl()), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
