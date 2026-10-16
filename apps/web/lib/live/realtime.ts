"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ApprovalPayload, Connection, RunEventPayload } from "./live-state";

export type LiveHandlers = {
  onRunEvent: (event: RunEventPayload) => void;
  onApproval: (event: string, approval: ApprovalPayload) => void;
  onStatus: (status: Connection) => void;
};

/** Assina o canal do workspace e devolve como sair. Trocável nos testes. */
export type Subscribe = (workspaceId: string, handlers: LiveHandlers) => () => void;

const APPROVAL_EVENTS = ["approval.created", "approval.decided", "approval.expired"] as const;
/** Espera entre tentativas de reabrir o canal (o próprio cliente reconecta o socket; isto cobre canal fechado). */
const BACKOFF_MS = [1000, 2000, 5000, 10000, 30000];

/**
 * Canal privado `workspace:<id>` do Realtime (S1a): só membros do workspace entram (política em
 * `realtime.messages`), e só o banco publica. O token é o da sessão do browser (cookie da Auth, legível pelo JS:
 * decisão da A1a, ver relatório §5); o cliente renova o token sozinho e repassa ao Realtime.
 */
export const subscribeWorkspace: Subscribe = (workspaceId, handlers) => {
  const supabase = getSupabaseBrowserClient();
  let channel: RealtimeChannel | null = null;
  let stopped = false;
  let attempt = 0;
  let retry: ReturnType<typeof setTimeout> | null = null;

  const drop = () => {
    if (channel) void supabase.removeChannel(channel);
    channel = null;
  };

  const later = () => {
    if (stopped || retry) return;
    const wait = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)]!;
    attempt += 1;
    retry = setTimeout(() => {
      retry = null;
      drop();
      void open();
    }, wait);
  };

  async function open() {
    if (stopped) return;
    handlers.onStatus("connecting");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (stopped) return;
    if (!token) {
      handlers.onStatus("lost");
      later();
      return;
    }
    await supabase.realtime.setAuth(token);
    if (stopped) return;
    const ch = supabase.channel(`workspace:${workspaceId}`, { config: { private: true } });
    channel = ch;
    ch.on("broadcast", { event: "run_event" }, (msg: { payload: unknown }) => handlers.onRunEvent(msg.payload as RunEventPayload));
    for (const event of APPROVAL_EVENTS) {
      ch.on("broadcast", { event }, (msg: { payload: unknown }) => handlers.onApproval(event, msg.payload as ApprovalPayload));
    }
    ch.subscribe((status: string) => {
      if (stopped || channel !== ch) return;
      if (status === "SUBSCRIBED") {
        attempt = 0;
        handlers.onStatus("live");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        handlers.onStatus("lost");
        later();
      }
    });
  }

  void open();
  return () => {
    stopped = true;
    if (retry) clearTimeout(retry);
    drop();
  };
};
