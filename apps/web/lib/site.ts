import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

// Textos do site público: messages/<idioma>/site.json. Fontes: Hero da Landing Page V1 (R32) e handoff
// V4.6, seção A (design/handoff-v4.6/README.md). Kiwi é Growth Marketing (decisão do dono, 15/10/2026).

/**
 * Base do Open Graph. A Metadata API do Next substitui o objeto openGraph inteiro quando uma página
 * define o seu: toda página que mexe em openGraph espalha esta base.
 */
export async function openGraphBase() {
  const [t, locale] = await Promise.all([getTranslations("site.meta"), getLocale()]);
  return {
    type: "website",
    locale: locale.replace("-", "_"),
    siteName: "HelloSquad",
    title: t("title"),
    description: t("description"),
  } satisfies NonNullable<Metadata["openGraph"]>;
}
