import { isApiError, unwrap, type components } from "@hellosquad/contracts";
import { cache } from "react";
import { serverApi } from "./api";

export type Approval = components["schemas"]["Approval"];
export type Conversation = components["schemas"]["Conversation"];
export type ConversationDetail = components["schemas"]["ConversationDetail"];
export type Message = components["schemas"]["Message"];
export type WorkItem = components["schemas"]["WorkItem"];
export type WorkItemDetail = components["schemas"]["WorkItemDetail"];
export type AgentId = components["schemas"]["AgentId"];

/** O que a casca precisa de cada workspace: pendências ("Precisa de você"), conversas e trabalhos. */
export type WorkspaceCore = {
  approvals: Approval[];
  conversations: Conversation[];
  workItems: WorkItem[];
  /** false quando a API não respondeu: a tela mostra estado vazio, nunca dado inventado. */
  ok: boolean;
};

/** Leituras do núcleo (S1b) uma vez por requisição; só GET. */
export const loadWorkspaceCore = cache(async (workspaceId: string): Promise<WorkspaceCore> => {
  try {
    const api = await serverApi();
    const path = { workspace_id: workspaceId };
    const [approvals, conversations, workItems] = await Promise.all([
      unwrap(api.GET("/workspaces/{workspace_id}/approvals", { params: { path, query: { status: "pending" } } })),
      unwrap(api.GET("/workspaces/{workspace_id}/conversations", { params: { path, query: { limit: 50 } } })),
      unwrap(api.GET("/workspaces/{workspace_id}/work-items", { params: { path, query: { limit: 50 } } })),
    ]);
    return { approvals: approvals.items, conversations: conversations.items, workItems: workItems.items, ok: true };
  } catch (error) {
    if (!isApiError(error)) throw error;
    return { approvals: [], conversations: [], workItems: [], ok: false };
  }
});

export const loadWorkItem = cache(async (workItemId: string): Promise<WorkItemDetail | null> => {
  try {
    const api = await serverApi();
    return await unwrap(api.GET("/work-items/{work_item_id}", { params: { path: { work_item_id: workItemId } } }));
  } catch (error) {
    if (isApiError(error) && (error.status === 404 || error.status === 422)) return null;
    throw error;
  }
});
