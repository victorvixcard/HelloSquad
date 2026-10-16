import { isAgentId } from "@hellosquad/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AgentEnvironment } from "@/components/env/AgentEnvironment";
import { ContentEnvironment } from "@/components/env/ContentEnvironment";
import { loadMe } from "@/lib/api";
import { loadWorkspaceCore } from "@/lib/core";
import { stripNeeds } from "@/lib/strip-needs";

type Params = { params: Promise<{ workspace: string; agente: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { agente } = await params;
  if (!isAgentId(agente)) return {};
  const tc = await getTranslations("common");
  return { title: tc(`areas.${agente}`) };
}

export default async function AgentePage({ params }: Params) {
  const { workspace: slug, agente } = await params;
  if (!isAgentId(agente)) notFound();
  const me = await loadMe();
  if (!me.ok) notFound();
  const membership = me.me.memberships.find((m) => m.workspace.slug === slug);
  if (!membership) notFound();
  const core = await loadWorkspaceCore(membership.workspace.id);
  const needs = await stripNeeds(slug, core.approvals, agente);
  const business = membership.workspace.name;
  if (agente === "otto") return <ContentEnvironment business={business} needs={needs} />;
  return <AgentEnvironment agent={agente} business={business} needs={needs} />;
}
