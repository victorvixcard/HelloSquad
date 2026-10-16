import { isApiError, unwrap } from "@hellosquad/contracts";
import { isAgentId, type AgentId } from "@hellosquad/ui";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TeamView } from "@/components/team/TeamView";
import type { ChatRow, TeamPending, TeamWork } from "@/components/team/team-data";
import { serverApi } from "@/lib/api";
import { loadWorkspaceCore, type Conversation } from "@/lib/core";
import { workItemHref } from "@/lib/needs";
import { workspaceOf } from "@/lib/workspace-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("team");
  return { title: t("title") };
}

/** Teto de leituras da última mensagem por página (uma por conversa, em paralelo); o resto fica sem a linha. */
const LAST_MESSAGE_READS = 20;

/** Última mensagem de pessoa ou agente (o protótipo ignora as do sistema), lida pelo fim da conversa. */
async function lastMessage(conversationId: string): Promise<ChatRow["last"]> {
  try {
    const api = await serverApi();
    const page = await unwrap(
      api.GET("/conversations/{conversation_id}/messages", {
        params: { path: { conversation_id: conversationId }, query: { before: "latest", limit: 3 } },
      }),
    );
    const m = [...page.items].reverse().find((x) => x.author_type === "user" || x.author_type === "agent");
    if (!m) return null;
    const agent = m.author_agent_id && isAgentId(m.author_agent_id) ? m.author_agent_id : null;
    return { by: m.author_type === "user" ? "user" : "agent", agent, text: m.body.replace(/\s+/g, " ").trim() };
  } catch (error) {
    if (isApiError(error)) return null;
    throw error;
  }
}

export default async function Page({ params }: { params: Promise<{ workspace: string }> }) {
  const workspace = await workspaceOf((await params).workspace);
  const core = await loadWorkspaceCore(workspace.id);
  const recent = (c: Conversation) => c.last_message_at ?? c.created_at;
  const conversations = core.conversations
    .filter((c) => !c.archived_at)
    .sort((a, b) => Date.parse(recent(b)) - Date.parse(recent(a)));
  const lasts = await Promise.all(
    conversations.map((c, i) => (i < LAST_MESSAGE_READS && c.last_message_at ? lastMessage(c.id) : Promise.resolve(null))),
  );
  const chats: ChatRow[] = conversations.map((c, i) => ({
    id: c.id,
    kind: c.kind,
    agent: c.primary_agent_id && isAgentId(c.primary_agent_id) ? c.primary_agent_id : null,
    title: c.title,
    topic: c.topic ?? null,
    unread: c.unread_count ?? 0,
    contextType: c.context_type,
    contextId: c.context_id,
    at: recent(c),
    last: lasts[i] ?? null,
  }));
  const pendingOf = new Map(
    core.approvals.filter((a) => a.status === "pending").map((a) => [a.work_item.id, a.delivery_version_no ?? null]),
  );
  const works: TeamWork[] = core.workItems.map((w) => {
    const agent: AgentId = isAgentId(w.primary_agent_id) ? w.primary_agent_id : "nexo";
    return {
      id: w.id,
      title: w.title,
      status: w.status,
      agent,
      collaborators: w.collaborator_agent_ids.filter(isAgentId),
      deliveryType: w.delivery_type,
      waitVersion: pendingOf.get(w.id) ?? null,
      href: workItemHref(workspace.slug, agent, w.id),
    };
  });
  const pending: TeamPending[] = core.approvals
    .filter((a) => a.status === "pending" && isAgentId(a.requested_by_agent_id))
    .map((a) => ({
      agent: a.requested_by_agent_id as AgentId,
      workItemId: a.work_item.id,
      version: a.delivery_version_no ?? null,
      deliveryType: a.work_item.delivery_type,
    }));
  return <TeamView business={workspace.name} chats={chats} works={works} pending={pending} />;
}
