"use server";

import { isApiError, unwrap, type components } from "@hellosquad/contracts";
import { serverApi } from "@/lib/api";

type Message = components["schemas"]["Message"];
type ConversationDetail = components["schemas"]["ConversationDetail"];
type Approval = components["schemas"]["Approval"];
type Decision = components["schemas"]["ApprovalDecision"];
export type FollowUp = "cancel" | "revise";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

function fail(error: unknown): { ok: false; code: string; message: string } {
  if (isApiError(error)) return { ok: false, code: error.code, message: error.message };
  throw error;
}

/** Mensagens por página no painel: a conversa abre pelas mais recentes e carrega as anteriores ao subir. */
const PAGE = 30;

export type MessageSlice = { messages: Message[]; /** cursor das anteriores (`before`); null = começo da conversa */ older: string | null };

/** Abre uma conversa que já existe: detalhe e a última página de mensagens (`before=latest`), em ordem. Só leitura. */
export async function loadConversationAction(
  conversationId: string,
): Promise<ActionResult<{ detail: ConversationDetail } & MessageSlice>> {
  try {
    const api = await serverApi();
    const path = { conversation_id: conversationId };
    const [detail, page] = await Promise.all([
      unwrap(api.GET("/conversations/{conversation_id}", { params: { path } })),
      unwrap(api.GET("/conversations/{conversation_id}/messages", { params: { path, query: { before: "latest", limit: PAGE } } })),
    ]);
    return { ok: true, data: { detail, messages: page.items, older: page.next_cursor } };
  } catch (error) {
    return fail(error);
  }
}

/** As mensagens anteriores a uma página já aberta (`before=<next_cursor>`), em ordem. Só leitura. */
export async function loadOlderMessagesAction(conversationId: string, before: string): Promise<ActionResult<MessageSlice>> {
  try {
    const api = await serverApi();
    const page = await unwrap(
      api.GET("/conversations/{conversation_id}/messages", {
        params: { path: { conversation_id: conversationId }, query: { before, limit: PAGE } },
      }),
    );
    return { ok: true, data: { messages: page.items, older: page.next_cursor } };
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

/**
 * POST /approvals/{id}/decision (idempotente na API; só o owner decide). Aprovar não publica nada (Documento Mestre).
 * Rejeitar uma entrega leva `follow_up` (dono, 16/10 08:55): `cancel` cancela o trabalho; `revise` pede nova proposta.
 */
export async function decideApprovalAction(
  approvalId: string,
  decision: Decision,
  note?: string,
  followUp?: FollowUp,
): Promise<ActionResult<Approval>> {
  try {
    const api = await serverApi();
    const approval = await unwrap(
      api.POST("/approvals/{approval_id}/decision", {
        params: { path: { approval_id: approvalId } },
        body: { decision, note: note ?? null, ...(followUp ? { follow_up: followUp } : {}) },
      }),
    );
    return { ok: true, data: approval };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Primeira mensagem de uma conversa direta nova: a API cria sempre uma conversa nova (`agent_direct`), nunca reaproveita.
 * O título é o começo da primeira mensagem, como no protótipo.
 */
export async function createDirectConversationAction(
  workspaceId: string,
  agent: components["schemas"]["AgentId"],
  title?: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const api = await serverApi();
    const conversation = await unwrap(
      api.POST("/workspaces/{workspace_id}/conversations", {
        params: { path: { workspace_id: workspaceId } },
        body: { kind: "agent_direct", primary_agent_id: agent, title: title ?? null },
      }),
    );
    return { ok: true, data: { id: conversation.id } };
  } catch (error) {
    return fail(error);
  }
}
