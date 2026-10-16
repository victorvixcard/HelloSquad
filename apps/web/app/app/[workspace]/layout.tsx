import { isAgentId, type AgentId } from "@hellosquad/ui";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ApiUnavailable } from "@/components/ApiUnavailable";
import { ProductShell, SIDEBAR_COOKIE } from "@/components/product/ProductShell";
import { loadMe } from "@/lib/api";
import { loadWorkspaceCore } from "@/lib/core";
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
  const direct: Partial<Record<AgentId, string>> = {};
  for (const c of core.conversations) {
    if (c.kind === "agent_direct" && c.primary_agent_id && isAgentId(c.primary_agent_id) && !direct[c.primary_agent_id]) {
      direct[c.primary_agent_id] = c.id;
    }
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
      conversationIds={{ room, direct }}
      initialSideMin={saved === "min" ? true : saved === "full" ? false : null}
    >
      {children}
    </ProductShell>
  );
}
