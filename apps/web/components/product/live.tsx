"use client";

import { AGENT_IDS, isAgentId, type AgentId } from "@hellosquad/ui";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { runEventsAction, runInfoAction } from "@/app/app/[workspace]/actions";
import {
  agentModes,
  initialLiveState,
  liveReducer,
  type AgentMode,
  type LiveState,
  type PendingApproval,
  type RunEventPayload,
} from "@/lib/live/live-state";
import { subscribeWorkspace, type Subscribe } from "@/lib/live/realtime";

export type LiveApi = {
  state: LiveState;
  /** Modo de cada um dos sete (V4.6 `_modes`): idle, work, wait, live. */
  modes: Record<AgentId, AgentMode>;
  /** O web criou o trabalho: liga o run à conversa antes do primeiro evento chegar. */
  linkRun: (runId: string, conversationId: string | null, workItemId: string | null) => void;
  /** A pessoa pediu ajuste ou nova proposta: o próximo run desse trabalho é uma revisão ("ajustando"). */
  expectRevision: (workItemId: string) => void;
};

const IDLE_STATE: LiveState = { ...initialLiveState(""), connection: "live" };
const IDLE: LiveApi = {
  state: IDLE_STATE,
  modes: Object.fromEntries(AGENT_IDS.map((a) => [a, "idle"])) as Record<AgentId, AgentMode>,
  linkRun: () => {},
  expectRevision: () => {},
};

const LiveContext = createContext<LiveApi>(IDLE);

/** Estado ao vivo do squad. Fora do provedor (testes de componente), todos disponíveis e conexão ok. */
export function useLive(): LiveApi {
  return useContext(LiveContext);
}

/** Intervalo para juntar vários eventos numa releitura só da casca (faixa, badge, Trabalhos, detalhe). */
const REFRESH_DEBOUNCE_MS = 250;

export function LiveProvider({
  workspaceId,
  pending,
  subscribe = subscribeWorkspace,
  children,
}: {
  workspaceId: string;
  /** Pendências que o servidor leu nesta renderização ("Precisa de você"). */
  pending: PendingApproval[];
  subscribe?: Subscribe;
  children: ReactNode;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(liveReducer, undefined, () => initialLiveState(workspaceId, pending));
  const stateRef = useRef(state);
  stateRef.current = state;
  const asked = useRef(new Set<string>());
  const revisions = useRef(new Set<string>());
  const wasLost = useRef(false);

  // O servidor releu (router.refresh): as pendências dele são a verdade.
  const pendingKey = pending.map((p) => p.id).join(",");
  useEffect(() => {
    dispatch({ type: "pending_synced", workspaceId, pending });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reage ao conjunto de pendências
  }, [workspaceId, pendingKey]);

  /** Run que o web não criou (decisão que gera run, outra aba, outra pessoa): busca a conversa e o trabalho dele. */
  const learnRun = useCallback(
    (runId: string) => {
      if (asked.current.has(runId)) return;
      asked.current.add(runId);
      void runInfoAction(runId).then((result) => {
        if (!result.ok) return;
        const { conversationId, workItemId, agentId } = result.data;
        dispatch({
          type: "run_linked",
          workspaceId,
          runId,
          conversationId,
          workItemId,
          owner: isAgentId(agentId) ? agentId : null,
          revision: !!workItemId && revisions.current.has(workItemId),
        });
      });
    },
    [workspaceId],
  );

  const onRunEvent = useCallback(
    (event: RunEventPayload) => {
      dispatch({ type: "run_event", workspaceId, event });
      const run = stateRef.current.runs[event.run_id];
      if (!run?.conversationId) learnRun(event.run_id);
    },
    [workspaceId, learnRun],
  );

  // O que o canal perdeu enquanto caiu: eventos dos runs ainda abertos, pela API (fallback do Realtime).
  const catchUp = useCallback(() => {
    for (const run of Object.values(stateRef.current.runs)) {
      if (run.status !== "queued" && run.status !== "running") continue;
      void runEventsAction(run.id, run.lastSeq).then((result) => {
        if (!result.ok) return;
        for (const e of result.data) {
          dispatch({ type: "run_event", workspaceId, event: { ...e, payload: e.payload as Record<string, unknown> } });
        }
      });
    }
    router.refresh();
  }, [workspaceId, router]);

  useEffect(() => {
    return subscribe(workspaceId, {
      onRunEvent,
      onApproval: (event, approval) => dispatch({ type: "approval", workspaceId, event, approval }),
      onStatus: (status) => {
        dispatch({ type: "connection", status });
        if (status === "lost") wasLost.current = true;
        if (status === "live" && wasLost.current) {
          wasLost.current = false;
          catchUp();
        }
      },
    });
  }, [workspaceId, subscribe, onRunEvent, catchUp]);

  // Dado novo no servidor: relê a casca (faixa "Precisa de você", badge da barra, Trabalhos do Início, entrega).
  useEffect(() => {
    if (state.version === 0) return;
    const timer = setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state.version, router]);

  const linkRun = useCallback<LiveApi["linkRun"]>(
    (runId, conversationId, workItemId) => {
      asked.current.add(runId);
      dispatch({
        type: "run_linked",
        workspaceId,
        runId,
        conversationId,
        workItemId,
        revision: !!workItemId && revisions.current.has(workItemId),
      });
    },
    [workspaceId],
  );
  const expectRevision = useCallback<LiveApi["expectRevision"]>((workItemId) => {
    revisions.current.add(workItemId);
  }, []);

  const modes = useMemo(() => agentModes(state), [state]);
  const api = useMemo<LiveApi>(() => ({ state, modes, linkRun, expectRevision }), [state, modes, linkRun, expectRevision]);
  return <LiveContext.Provider value={api}>{children}</LiveContext.Provider>;
}
