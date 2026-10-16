import { getAgent, isAgentId } from "@hellosquad/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyPage } from "@/components/shell/EmptyPage";

type Params = { params: Promise<{ agente: string }> };

/** "ao Nexo", "à Íris". */
function toAgent(article: string, name: string) {
  return `${article === "a" ? "à" : "ao"} ${name}`;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { agente } = await params;
  if (!isAgentId(agente)) return {};
  const member = getAgent(agente);
  return { title: `${member.area} · ${member.name}` };
}

export default async function AgentePage({ params }: Params) {
  const { agente } = await params;
  if (!isAgentId(agente)) notFound();
  const member = getAgent(agente);
  return (
    <EmptyPage
      eyebrow="Seu squad"
      title={member.area}
      agent={member.id}
      placeholder={`Peça algo ${toAgent(member.article, member.name)}`}
    />
  );
}
