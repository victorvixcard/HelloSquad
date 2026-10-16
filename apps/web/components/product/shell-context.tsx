"use client";

import type { AgentId } from "@hellosquad/ui";
import { createContext, useContext } from "react";
import type { ConversationMode, Layout } from "@/lib/product-layout";

/** Objeto sobre o qual se conversa: o cartão de contexto do painel (ambiente, trabalho, entrega). */
export type ConversationContextRef = {
  kind: "env" | "work_item";
  label: string;
  href?: string;
};

export type ConversationTarget = {
  /** Conversa que já existe na API; null = ainda não há conversa com esse objeto. */
  conversationId: string | null;
  /** Especialista da conversa direta; null na Sala do Squad. */
  agent: AgentId | null;
  room?: boolean;
  context?: ConversationContextRef;
};

export type ShellApi = {
  workspace: { id: string; slug: string; name: string };
  layout: Layout;
  conversation: { mode: ConversationMode; target: ConversationTarget | null };
  openConversation: (target: ConversationTarget, mode?: Exclude<ConversationMode, "off">) => void;
  closeConversation: () => void;
  /** Conversas já existentes do workspace (Sala do Squad e diretas), para reabrir o mesmo histórico. */
  conversationIds: { room: string | null; direct: Partial<Record<AgentId, string>> };
  toast: (text: string, agent?: AgentId) => void;
};

export const ShellContext = createContext<ShellApi | null>(null);

export function useShell(): ShellApi {
  const api = useContext(ShellContext);
  if (!api) throw new Error("useShell fora do ProductShell");
  return api;
}
