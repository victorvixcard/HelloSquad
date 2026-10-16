import { SitePage, siteMetadata } from "@/components/site/SitePage";

// Versão en: o middleware põe o idioma na requisição (ADR-0010), como em /en.
export function generateMetadata() {
  return siteMetadata("en", "faq");
}

export default function Page() {
  return <SitePage locale="en" page="faq" />;
}
