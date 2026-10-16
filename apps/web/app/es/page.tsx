import { Landing, landingMetadata } from "@/components/site/Landing";
import "../home.css";

// Versão es da página pública (ADR-0010); o middleware põe o idioma na requisição.
export function generateMetadata() {
  return landingMetadata("es");
}

export default function Home() {
  return <Landing locale="es" />;
}
