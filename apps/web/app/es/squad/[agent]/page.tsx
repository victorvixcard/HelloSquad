import { isAgentId } from "@hellosquad/ui";
import { notFound } from "next/navigation";
import { SitePage, siteMetadata } from "@/components/site/SitePage";
import { agentPageKey } from "@/lib/site-routes";

type Props = { params: Promise<{ agent: string }> };

// Versão es: o middleware põe o idioma na requisição; agente desconhecido dá 404.

export async function generateMetadata({ params }: Props) {
  const { agent } = await params;
  if (!isAgentId(agent)) notFound();
  return siteMetadata("es", agentPageKey(agent));
}

export default async function Page({ params }: Props) {
  const { agent } = await params;
  if (!isAgentId(agent)) notFound();
  return <SitePage locale="es" page={agentPageKey(agent)} />;
}
