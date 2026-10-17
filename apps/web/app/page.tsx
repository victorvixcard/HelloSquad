import { Landing, landingMetadata } from "@/components/site/Landing";

// Estática (○): o idioma é pt-BR e não depende da requisição; /en e /es são as outras versões.
export const dynamic = "force-static";

export function generateMetadata() {
  return landingMetadata("pt-BR");
}

export default function Home() {
  return <Landing locale="pt-BR" />;
}
