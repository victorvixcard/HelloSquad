import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { LandingR32 } from "@/components/landing/LandingR32";
import { landingDictionary } from "@/lib/landing-i18n";
import { siteJsonLd, siteMetadata } from "@/lib/site-seo";
import { JsonLd } from "./SiteChrome";

/** Metadados da página inicial num idioma: os da N2a (inicio.md), canônico próprio e `hreflang` para as três versões. */
export async function landingMetadata(locale: Locale): Promise<Metadata> {
  return siteMetadata(locale, "inicio");
}

/**
 * A página pública do HelloSquad num idioma (ADR-0010): `/` em pt-BR, `/en` e `/es`. É a Landing V1 (R32) do handoff,
 * seção por seção, com os motores de animação do protótipo (L1). O JSON-LD da A2c segue no HTML do servidor.
 */
export async function Landing({ locale }: { locale: Locale }) {
  const ld = await siteJsonLd(locale, "inicio");
  return (
    <>
      <JsonLd data={ld} />
      <LandingR32 dictionary={landingDictionary(locale)} />
    </>
  );
}
