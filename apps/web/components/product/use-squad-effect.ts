"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { createWorkItemAction, decideApprovalAction } from "@/app/app/[workspace]/actions";
import { deliveryForRequest, workTitleFrom } from "@/lib/live/request";
import { useLive } from "./live";
import { useShell, type ConversationTarget } from "./shell-context";

export type SquadEffectActions = { createWork: typeof createWorkItemAction; decide: typeof decideApprovalAction };

export const SQUAD_EFFECT_ACTIONS: SquadEffectActions = { createWork: createWorkItemAction, decide: decideApprovalAction };

/**
 * O que uma mensagem da pessoa faz no squad, depois de gravada (para entrar no histórico que o agente lê):
 * (1) "Pedir ajuste" registra `changes_requested` com a nota = texto (dono, 16/10 10:20);
 * (2) com uma pergunta do agente pendente nesta conversa, o texto é a resposta (`answered`, V4.6 §5 "Responder");
 * (3) o pedido de uma entrega que o squad executa vira trabalho com run na fila (`POST /messages/{id}/work-items`):
 * na conversa de um pedido do catálogo (A2b), a entrega é a da capacidade; nas outras, a das palavras do pedido (na
 * Sala do Squad e com o Nexo, a campanha vira o projeto coordenado 01.02, A2d); senão, fica só a mensagem. O resultado (status, resposta, entrega, pendência) chega pelo Realtime.
 * Devolve false quando a API recusou a decisão ou o trabalho.
 */
export function useSquadEffect(actions: SquadEffectActions = SQUAD_EFFECT_ACTIONS) {
  const shell = useShell();
  const live = useLive();
  const router = useRouter();
  return useCallback(
    async ({
      conversationId,
      messageId,
      body,
      adjust,
      deliveryType,
      coordinator,
    }: {
      conversationId: string;
      messageId: string;
      body: string;
      adjust?: ConversationTarget["adjust"] | null;
      /** Pedido do catálogo (A2b): a entrega já escolhida pela capacidade, sem depender das palavras do pedido. */
      deliveryType?: string | null;
      /** Sala do Squad ou conversa com o Nexo: o pedido de campanha monta o projeto coordenado (A2d). */
      coordinator?: boolean;
    }): Promise<boolean> => {
      if (adjust) {
        const r = await actions.decide(adjust.approvalId, "changes_requested", body);
        if (!r.ok) return false;
        live.expectRevision(adjust.workItemId);
        router.refresh();
        return true;
      }
      const answer = Object.values(live.state.pending).find(
        (p) => p.kind === "respond" && shell.workConversations[p.workItemId] === conversationId,
      );
      if (answer && shell.canDecide) {
        const r = await actions.decide(answer.id, "answered", body);
        if (!r.ok) return false;
        router.refresh();
        return true;
      }
      const type = deliveryType ?? deliveryForRequest(body, { coordinator });
      if (!type) return true;
      const r = await actions.createWork(messageId, type, workTitleFrom(body));
      if (!r.ok) return false;
      if (r.data.runId) live.linkRun(r.data.runId, r.data.conversationId ?? conversationId, r.data.workItemId);
      router.refresh();
      return true;
    },
    [actions, live, shell.workConversations, shell.canDecide, router],
  );
}
