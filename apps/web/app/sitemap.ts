import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

// Só páginas públicas e indexáveis. A área logada (/app) fica fora.
export default function sitemap(): MetadataRoute.Sitemap {
  const url = siteUrl();
  return [
    { url: `${url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${url}/criar-conta`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
