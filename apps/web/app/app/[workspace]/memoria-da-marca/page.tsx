import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MemoryView } from "@/components/memory/MemoryView";
import { MemoryUnavailable } from "@/components/memory/MemoryUnavailable";
import { loadMe } from "@/lib/api";
import { loadMemory } from "@/lib/memory";
import { workspaceOf } from "@/lib/workspace-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("memory");
  return { title: t("title") };
}

/** Memória da Marca (V4.5/V4.6): o que o squad sabe, o que percebeu e espera o seu ok, de onde vem e o que mudou. */
export default async function Page({ params }: { params: Promise<{ workspace: string }> }) {
  const workspace = await workspaceOf((await params).workspace);
  const [memory, me] = await Promise.all([loadMemory(workspace.id), loadMe()]);
  if (!memory.ok) return <MemoryUnavailable />;
  const name = me.ok ? (me.me.user.full_name || me.me.user.email || "").trim() : "";
  return <MemoryView data={memory.data} business={workspace.name} userInitial={name.charAt(0).toUpperCase() || "?"} />;
}
