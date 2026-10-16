import { AGENT_IDS, isAgentId } from "@hellosquad/ui";
import { notFound } from "next/navigation";
import { SitePage, siteMetadata } from "@/components/site/SitePage";
import { agentPageKey } from "@/lib/site-routes";

type Props = { params: Promise<{ agent: string }> };

// Estáticas (●): uma página por agente, geradas no build; outro slug dá 404.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return AGENT_IDS.map((agent) => ({ agent }));
}

export async function generateMetadata({ params }: Props) {
  const { agent } = await params;
  if (!isAgentId(agent)) notFound();
  return siteMetadata("pt-BR", agentPageKey(agent));
}

export default async function Page({ params }: Props) {
  const { agent } = await params;
  if (!isAgentId(agent)) notFound();
  return <SitePage locale="pt-BR" page={agentPageKey(agent)} />;
}
