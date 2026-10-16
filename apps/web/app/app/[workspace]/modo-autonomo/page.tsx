import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AutonomyView } from "@/components/auto/AutonomyView";
import { workspaceOf } from "@/lib/workspace-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auto");
  return { title: t("title") };
}

/** Modo Autônomo: rotinas chegam na Fase 3; até lá, o estado da V4.6 sem nenhuma responsabilidade. */
export default async function Page({ params }: { params: Promise<{ workspace: string }> }) {
  const workspace = await workspaceOf((await params).workspace);
  return <AutonomyView business={workspace.name} />;
}
