import type { MetadataRoute } from "next";
import { LOCALES } from "@/i18n/config";
import { siteUrl } from "@/lib/env";
import { SITE_PAGE_KEYS, siteLanguages, sitePath } from "@/lib/site-routes";

// Só páginas públicas e indexáveis: as doze do site (N2a) em pt-BR, en e es, cada uma com as alternativas de idioma
// (hreflang, x-default no pt-BR), e o cadastro. A área logada (/app), o Super Admin (/admin) e /entrar ficam fora.
export default function sitemap(): MetadataRoute.Sitemap {
  const url = siteUrl();
  const absolute = (path: string) => (path === "/" ? `${url}/` : `${url}${path}`);
  return [
    ...SITE_PAGE_KEYS.flatMap((key) => {
      const languages = Object.fromEntries(
        Object.entries(siteLanguages(key)).map(([locale, path]) => [locale, absolute(path)]),
      );
      return LOCALES.map((locale) => ({
        url: absolute(sitePath(key, locale)),
        changeFrequency: "weekly" as const,
        priority: key === "inicio" ? 1 : key.startsWith("squad") ? 0.8 : 0.7,
        alternates: { languages },
      }));
    }),
    { url: `${url}/criar-conta`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
