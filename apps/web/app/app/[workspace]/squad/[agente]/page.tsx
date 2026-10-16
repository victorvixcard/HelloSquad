import { isAgentId, type AgentId } from "@hellosquad/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AgentEnvironment } from "@/components/env/AgentEnvironment";
import { BrandPage } from "@/components/env/brand/BrandPage";
import { ContentPage } from "@/components/env/content/ContentPage";
import { CrmPage } from "@/components/env/crm/CrmPage";
import type { EnvPageProps } from "@/components/env/env-page";
import { GrowthPage } from "@/components/env/growth/GrowthPage";
import { ProjectsPage } from "@/components/env/projects/ProjectsPage";
import { ResultsPage } from "@/components/env/results/ResultsPage";
import { StrategyPage } from "@/components/env/strategy/StrategyPage";
import { loadMe } from "@/lib/api";
import { loadWorkspaceCore } from "@/lib/core";
import { stripNeeds } from "@/lib/strip-needs";

type Params = { params: Promise<{ workspace: string; agente: string }> };

/** Página de cada ambiente do squad (V4.6: um ambiente por especialista; Conteúdo · Otto veio na A1f). */
const PAGES: Partial<Record<AgentId, (props: EnvPageProps) => Promise<ReactNode>>> = {
  nexo: ProjectsPage,
  bia: StrategyPage,
  kaia: BrandPage,
  kiwi: GrowthPage,
  max: CrmPage,
  iris: ResultsPage,
};

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
  const workspace = { id: membership.workspace.id, slug: membership.workspace.slug, name: business };
  if (agente === "otto") return <ContentPage workspace={workspace} needs={needs} />;
  const Page = PAGES[agente];
  if (!Page) return <AgentEnvironment agent={agente} business={business} needs={needs} />;
  return <Page workspace={workspace} needs={needs} />;
}
