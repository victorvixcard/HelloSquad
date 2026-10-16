import { isAgentId, type AgentId } from "@hellosquad/ui";
import type { Approval, WorkItem } from "./core";

/** Item da faixa "Precisa de você" (V4.6): quem pede, o tipo de decisão, o quê e a ação. */
export type NeedItem = {
  approvalId: string;
  workItemId: string;
  agent: AgentId;
  kind: Approval["kind"];
  title: string;
  deliveryType: string | null;
  versionNo: number | null;
  href: string;
};

export function workItemHref(slug: string, agent: AgentId, workItemId: string): string {
  return `/app/${slug}/squad/${agent}/trabalho/${workItemId}`;
}

export function needItems(slug: string, approvals: Approval[]): NeedItem[] {
  return approvals
    .filter((a) => a.status === "pending")
    .map((a) => {
      const agent: AgentId = isAgentId(a.requested_by_agent_id) ? a.requested_by_agent_id : "nexo";
      return {
        approvalId: a.id,
        workItemId: a.work_item.id,
        agent,
        kind: a.kind,
        title: a.work_item.title,
        deliveryType: a.work_item.delivery_type,
        versionNo: a.delivery_version_no,
        href: workItemHref(slug, isAgentId(a.work_item.primary_agent_id) ? a.work_item.primary_agent_id : agent, a.work_item.id),
      };
    });
}

export function inProgressItems(slug: string, items: WorkItem[]) {
  return items
    .filter((w) => w.status === "in_progress")
    .map((w) => {
      const agent: AgentId = isAgentId(w.primary_agent_id) ? w.primary_agent_id : "nexo";
      return { id: w.id, agent, title: w.title, status: w.status, href: workItemHref(slug, agent, w.id) };
    });
}
