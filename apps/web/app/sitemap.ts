import type { MetadataRoute } from "next";
import { PUBLIC_LOCALE_PATHS } from "@/i18n/resolve";
import { siteUrl } from "@/lib/env";

// Só páginas públicas e indexáveis. A área logada (/app) fica fora. A página inicial existe em pt-BR (/), en e es,
// com as alternativas de idioma (hreflang) em cada uma.
export default function sitemap(): MetadataRoute.Sitemap {
  const url = siteUrl();
  const languages = Object.fromEntries(Object.entries(PUBLIC_LOCALE_PATHS).map(([locale, path]) => [locale, `${url}${path}`]));
  return [
    ...Object.values(PUBLIC_LOCALE_PATHS).map((path) => ({
      url: `${url}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : 0.9,
      alternates: { languages },
    })),
    { url: `${url}/criar-conta`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
