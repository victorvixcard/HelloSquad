import { Landing, landingMetadata } from "@/components/site/Landing";
import "../home.css";

// Versão en da página pública (ADR-0010); o middleware põe o idioma na requisição.
export function generateMetadata() {
  return landingMetadata("en");
}

export default function Home() {
  return <Landing locale="en" />;
}
