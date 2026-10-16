import { SitePage, siteMetadata } from "@/components/site/SitePage";

// Estática (○): pt-BR não depende da requisição (A2a); en e es passam pelo middleware.
export const dynamic = "force-static";

export function generateMetadata() {
  return siteMetadata("pt-BR", "faq");
}

export default function Page() {
  return <SitePage locale="pt-BR" page="faq" />;
}
