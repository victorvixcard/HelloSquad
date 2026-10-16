import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

// Buscadores e assistentes de IA podem ler o site público; a área logada nunca.
const PRIVATE = ["/app", "/sair"];
const AI_CRAWLERS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"];

export default function robots(): MetadataRoute.Robots {
  const url = siteUrl();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${url}/sitemap.xml`,
    host: url,
  };
}
