import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { HomeView } from "@/components/home/HomeView";
import { loadMe } from "@/lib/api";
import { loadWorkspaceCore } from "@/lib/core";
import { inProgressItems, needItems } from "@/lib/needs";

type Params = { params: Promise<{ workspace: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return { title: t("title") };
}

export default async function InicioPage({ params }: Params) {
  const { workspace: slug } = await params;
  const me = await loadMe();
  if (!me.ok) notFound();
  const membership = me.me.memberships.find((m) => m.workspace.slug === slug);
  if (!membership) notFound();
  const core = await loadWorkspaceCore(membership.workspace.id);
  const t = await getTranslations("pages.needs");
  const tc = await getTranslations("common");
  const needs = needItems(slug, core.approvals).map((n) => ({
    approvalId: n.approvalId,
    agent: n.agent,
    title: n.title,
    kindLabel: tc(`approvalKinds.${n.kind}`),
    cta: t(`cta.${n.kind}`, { object: n.deliveryType === "04.01" ? t("object.d0401") : t("object.default") }),
    href: n.href,
  }));
  const inProgress = inProgressItems(slug, core.workItems).map((w) => ({ ...w, status: tc(`states.${w.status}`) }));
  const firstName = (me.me.user.full_name || me.me.user.email || "").trim().split(/\s+/)[0] ?? "";
  return <HomeView firstName={firstName} business={membership.workspace.name} needs={needs} inProgress={inProgress} />;
}
