import { SitePage, siteMetadata } from "@/components/site/SitePage";

// Versão es: o middleware põe o idioma na requisição (ADR-0010), como em /es.
export function generateMetadata() {
  return siteMetadata("es", "squad");
}

export default function Page() {
  return <SitePage locale="es" page="squad" />;
}
