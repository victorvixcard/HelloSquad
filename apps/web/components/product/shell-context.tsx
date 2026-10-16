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
  /** "Nova conversa" com o especialista: rascunho que vira conversa na API com a primeira mensagem. */
  fresh?: boolean;
};

/** Conversa direta anterior com um especialista (seletor "Conversas com…" do cabeçalho, V4.6). */
export type DirectThread = { id: string; title: string | null; at: string };

export type ShellApi = {
  workspace: { id: string; slug: string; name: string };
  layout: Layout;
  conversation: { mode: ConversationMode; target: ConversationTarget | null };
  openConversation: (target: ConversationTarget, mode?: Exclude<ConversationMode, "off">) => void;
  closeConversation: () => void;
  /** Conversas já existentes do workspace (Sala do Squad e a direta mais recente de cada especialista). */
  conversationIds: { room: string | null; direct: Partial<Record<AgentId, string>> };
  /** Conversas diretas de cada especialista, da mais recente para a mais antiga. */
  directThreads: Partial<Record<AgentId, DirectThread[]>>;
  /** Conversa direta criada agora entra no topo do histórico do especialista. */
  rememberThread: (agent: AgentId, thread: DirectThread) => void;
  /** Só o dono da conta (papel owner) decide: revisar, aprovar, rejeitar, autorizar (dono, 16/10 08:55). */
  canDecide: boolean;
  toast: (text: string, agent?: AgentId) => void;
};

export const ShellContext = createContext<ShellApi | null>(null);

export function useShell(): ShellApi {
  const api = useContext(ShellContext);
  if (!api) throw new Error("useShell fora do ProductShell");
  return api;
}
