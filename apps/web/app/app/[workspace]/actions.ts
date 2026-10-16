"use server";

import { isApiError, unwrap, type components } from "@hellosquad/contracts";
import { serverApi } from "@/lib/api";

type Message = components["schemas"]["Message"];
type ConversationDetail = components["schemas"]["ConversationDetail"];
type Approval = components["schemas"]["Approval"];
type Decision = components["schemas"]["ApprovalDecision"];

export type ActionResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

function fail(error: unknown): { ok: false; code: string; message: string } {
  if (isApiError(error)) return { ok: false, code: error.code, message: error.message };
  throw error;
}

/** Abre uma conversa que já existe: detalhe (participantes e contexto) e as mensagens, em ordem. Só leitura. */
export async function loadConversationAction(
  conversationId: string,
): Promise<ActionResult<{ detail: ConversationDetail; messages: Message[] }>> {
  try {
    const api = await serverApi();
    const path = { conversation_id: conversationId };
    const [detail, page] = await Promise.all([
      unwrap(api.GET("/conversations/{conversation_id}", { params: { path } })),
      unwrap(api.GET("/conversations/{conversation_id}/messages", { params: { path, query: { limit: 100 } } })),
    ]);
    return { ok: true, data: { detail, messages: page.items } };
  } catch (error) {
    return fail(error);
  }
}

/** POST /conversations/{id}/messages: a mensagem da pessoa entra na conversa. */
export async function sendMessageAction(conversationId: string, body: string): Promise<ActionResult<Message>> {
  try {
    const api = await serverApi();
    const message = await unwrap(
      api.POST("/conversations/{conversation_id}/messages", {
        params: { path: { conversation_id: conversationId } },
        body: { body },
      }),
    );
    return { ok: true, data: message };
  } catch (error) {
    return fail(error);
  }
}

/** POST /approvals/{id}/decision (idempotente na API). Aprovar não publica nada (Documento Mestre). */
export async function decideApprovalAction(
  approvalId: string,
  decision: Decision,
  note?: string,
): Promise<ActionResult<Approval>> {
  try {
    const api = await serverApi();
    const approval = await unwrap(
      api.POST("/approvals/{approval_id}/decision", {
        params: { path: { approval_id: approvalId } },
        body: { decision, note: note ?? null },
      }),
    );
    return { ok: true, data: approval };
  } catch (error) {
    return fail(error);
  }
}

/** Primeira mensagem para um especialista sem conversa ainda: cria a conversa direta (buscar ou criar na API). */
export async function createDirectConversationAction(
  workspaceId: string,
  agent: components["schemas"]["AgentId"],
): Promise<ActionResult<{ id: string }>> {
  try {
    const api = await serverApi();
    const conversation = await unwrap(
      api.POST("/workspaces/{workspace_id}/conversations", {
        params: { path: { workspace_id: workspaceId } },
        body: { kind: "agent_direct", primary_agent_id: agent },
      }),
    );
    return { ok: true, data: { id: conversation.id } };
  } catch (error) {
    return fail(error);
  }
}
