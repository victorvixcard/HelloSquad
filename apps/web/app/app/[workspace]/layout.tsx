import { isAgentId, type AgentId } from "@hellosquad/ui";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ApiUnavailable } from "@/components/ApiUnavailable";
import { ProductShell, SIDEBAR_COOKIE } from "@/components/product/ProductShell";
import type { DirectThread } from "@/components/product/shell-context";
import { loadMe } from "@/lib/api";
import { loadWorkspaceCore } from "@/lib/core";
import "@hellosquad/ui/ds-bundle.css";
import "@hellosquad/ui/product-ui.css";
import "./product.css";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const result = await loadMe();
  if (!result.ok) return <ApiUnavailable error={result.error} retryHref={`/app/${slug}`} />;
  const { me } = result;
  // Só os workspaces de quem está logado (a API já filtra pela RLS); outro slug é 404.
  const membership = me.memberships.find((m) => m.workspace.slug === slug);
  if (!membership) notFound();
  const workspace = { id: membership.workspace.id, slug: membership.workspace.slug, name: membership.workspace.name };
  const core = await loadWorkspaceCore(workspace.id);
  const saved = (await cookies()).get(SIDEBAR_COOKIE)?.value;
  const room = core.conversations.find((c) => c.kind === "squad_room")?.id ?? null;
  // Conversas diretas por especialista, da mais recente para a mais antiga (V4.6: abrir retoma a mais recente;
  // "Nova conversa" cria outra e o seletor lista as anteriores).
  const directThreads: Partial<Record<AgentId, DirectThread[]>> = {};
  const recent = (c: { last_message_at: string | null; created_at: string }) => c.last_message_at ?? c.created_at;
  for (const c of [...core.conversations].sort((a, b) => Date.parse(recent(b)) - Date.parse(recent(a)))) {
    if (c.kind !== "agent_direct" || c.archived_at || !c.primary_agent_id || !isAgentId(c.primary_agent_id)) continue;
    (directThreads[c.primary_agent_id] ??= []).push({ id: c.id, title: c.title, at: recent(c) });
  }
  const waiting = [...new Set(core.approvals.map((a) => a.requested_by_agent_id).filter(isAgentId))];
  const firstName = (me.user.full_name || me.user.email || "").trim().split(/\s+/)[0] ?? "";
  return (
    <ProductShell
      workspace={workspace}
      account={{
        name: firstName,
        role: membership.role,
        business: { slug: workspace.slug, name: workspace.name },
        businesses: me.memberships.map((m) => ({ slug: m.workspace.slug, name: m.workspace.name })),
      }}
      needsCount={core.approvals.length}
      waitingAgents={waiting}
      room={room}
      directThreads={directThreads}
      canDecide={membership.role === "owner"}
      initialSideMin={saved === "min" ? true : saved === "full" ? false : null}
    >
      {children}
    </ProductShell>
  );
}
