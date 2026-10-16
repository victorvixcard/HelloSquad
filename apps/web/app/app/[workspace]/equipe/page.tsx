import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlaceholderView } from "@/components/env/PlaceholderView";
import { workspaceOf } from "@/lib/workspace-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.team");
  return { title: t("title") };
}

export default async function Page({ params }: { params: Promise<{ workspace: string }> }) {
  const workspace = await workspaceOf((await params).workspace);
  return <PlaceholderView page="team" business={workspace.name} />;
}
