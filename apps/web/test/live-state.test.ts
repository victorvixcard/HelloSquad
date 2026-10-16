import { describe, expect, it } from "vitest";
import {
  agentModes,
  conversationLive,
  initialLiveState,
  liveReducer,
  shortNowKey,
  type LiveAction,
  type LiveState,
  type RunEventPayload,
} from "@/lib/live/live-state";

const WS = "ws-miolo";
const OTHER = "ws-vitta";
const RUN = "run-1";
const CONV = "conv-otto";

let seq = 0;
function ev(type: string, payload: Record<string, unknown> = {}, at = ++seq, run = RUN): RunEventPayload {
  return { id: `${run}-${at}`, run_id: run, seq: at, type, payload, created_at: "2026-10-16T10:40:00Z" };
}
const runEvent = (event: RunEventPayload, workspaceId = WS): LiveAction => ({ type: "run_event", workspaceId, event });
const reduce = (state: LiveState, actions: LiveAction[]) => actions.reduce(liveReducer, state);

/** A ordem que o worker grava (S1c §2): entrega pontual 04.01 do Otto. */
function deliveryRun(): RunEventPayload[] {
  seq = 0;
  return [
    ev("started", { agent_id: "otto", attempt: 1 }),
    ev("agent.thinking", { agent_id: "nexo", step: "nexo.triage" }),
    ev("step.done", { agent_id: "nexo", step: "nexo.triage", seq: 1 }),
    ev("agent.thinking", { agent_id: "otto", step: "otto.produce" }),
    ev("step.done", { agent_id: "otto", step: "otto.produce", seq: 3 }),
    ev("agent.thinking", { agent_id: "otto", step: "otto.check" }),
    ev("step.done", { agent_id: "otto", step: "otto.check", seq: 4 }),
    ev("delivery.created", { delivery_id: "d-1", delivery_version_id: "v-1", version_no: 1 }),
    ev("message.created", { message_id: "m-9", conversation_id: CONV, agent_id: "otto" }),
    ev("approval.requested", { approval_id: "ap-9", kind: "review" }),
    ev("finished", { status: "succeeded", work_item_status: "needs_you" }),
  ];
}

describe("reducer dos eventos ao vivo", () => {
  it("na ordem do worker: Nexo organiza, Otto escreve, a revisão fica com o Otto e o run termina", () => {
    const events = deliveryRun();
    let state = liveReducer(initialLiveState(WS), {
      type: "run_linked",
      workspaceId: WS,
      runId: RUN,
      conversationId: CONV,
      workItemId: "wi-1",
    });
    // Ninguém trabalhando: os sete disponíveis.
    expect(Object.values(agentModes(state))).toEqual(Array(7).fill("idle"));

    state = reduce(state, events.slice(0, 2).map((e) => runEvent(e)));
    expect(conversationLive(state, CONV)).toEqual({ kind: "work", lead: "nexo", detail: "organizing", typing: "nexo" });
    expect(agentModes(state).nexo).toBe("live");
    expect(shortNowKey("nexo", agentModes(state).nexo)).toBe("coordinating");

    state = reduce(state, events.slice(2, 4).map((e) => runEvent(e)));
    expect(conversationLive(state, CONV)).toEqual({ kind: "work", lead: "otto", detail: "creatingFirst", typing: "otto" });
    expect(agentModes(state).otto).toBe("work");
    expect(shortNowKey("otto", "work")).toBe("writing");
    expect(shortNowKey("kaia", "work")).toBe("creating");
    expect(shortNowKey("bia", "work")).toBe("researching");
    expect(shortNowKey("max", "work")).toBe("working");

    const before = state.version;
    state = reduce(state, events.slice(4).map((e) => runEvent(e)));
    expect(state.runs[RUN]?.status).toBe("succeeded");
    expect(conversationLive(state, CONV)).toBeNull();
    // A revisão pedida pelo Otto deixa o Otto "aguarda você" e o Nexo coordenando.
    expect(state.pending["ap-9"]).toEqual({ id: "ap-9", agent: "otto", kind: "review", workItemId: "wi-1" });
    expect(agentModes(state)).toMatchObject({ otto: "wait", nexo: "live", kaia: "idle" });
    expect(shortNowKey("otto", "wait")).toBe("waiting");
    // Mensagem nova na conversa do Otto e dado novo para a casca (entrega, mensagem, pendência, fim).
    expect(state.messages[CONV]).toBe(1);
    expect(state.version).toBe(before + 4);
  });

  it("é idempotente: o mesmo evento duas vezes (reconexão + fallback da API) não muda nada", () => {
    const events = deliveryRun();
    const once = reduce(initialLiveState(WS), events.map((e) => runEvent(e)));
    const twice = reduce(once, events.map((e) => runEvent(e)));
    expect(twice).toBe(once);
    expect(twice.messages[CONV]).toBe(1);
  });

  it("evento antigo que chega depois do mais novo é ignorado (seq só anda para frente)", () => {
    const events = deliveryRun();
    const late = reduce(initialLiveState(WS), [runEvent(events[3]!), runEvent(events[1]!)]);
    expect(late.runs[RUN]?.agent).toBe("otto");
    expect(late.runs[RUN]?.lastSeq).toBe(4);
  });

  it("evento de outro workspace é ignorado (canal antigo depois de trocar de negócio)", () => {
    const events = deliveryRun();
    const state = initialLiveState(WS);
    const after = reduce(state, [
      ...events.map((e) => runEvent(e, OTHER)),
      { type: "approval", workspaceId: OTHER, event: "approval.created", approval: { id: "ap-x", work_item_id: "w", kind: "review", status: "pending", requested_by_agent_id: "otto" } },
      { type: "run_linked", workspaceId: OTHER, runId: RUN, conversationId: CONV, workItemId: "wi-1" },
    ]);
    expect(after).toBe(state);
  });

  it("falha encerra o status e devolve o especialista a disponível", () => {
    seq = 0;
    const state = reduce(initialLiveState(WS), [
      { type: "run_linked", workspaceId: WS, runId: RUN, conversationId: CONV, workItemId: "wi-1" },
      runEvent(ev("started", { agent_id: "otto" })),
      runEvent(ev("agent.thinking", { agent_id: "otto", step: "otto.produce" })),
      runEvent(ev("failed", { code: "provider_unavailable", work_item_status: "failed" })),
    ]);
    expect(state.runs[RUN]?.status).toBe("failed");
    expect(conversationLive(state, CONV)).toBeNull();
    expect(agentModes(state).otto).toBe("idle");
  });

  it("pendência do Nexo (pergunta) deixa o Nexo aguardando; decidir tira da faixa uma vez só", () => {
    const created: LiveAction = {
      type: "approval",
      workspaceId: WS,
      event: "approval.created",
      approval: { id: "ap-q", work_item_id: "wi-2", kind: "respond", status: "pending", requested_by_agent_id: "nexo" },
    };
    let state = reduce(initialLiveState(WS), [created, created]);
    expect(Object.keys(state.pending)).toEqual(["ap-q"]);
    expect(agentModes(state).nexo).toBe("wait");
    expect(state.version).toBe(1);

    const answered: LiveAction = {
      type: "approval",
      workspaceId: WS,
      event: "approval.decided",
      approval: { id: "ap-q", work_item_id: "wi-2", kind: "respond", status: "decided", decision: "answered", requested_by_agent_id: "nexo" },
    };
    state = reduce(state, [answered, answered]);
    expect(state.pending).toEqual({});
    expect(state.version).toBe(2);
    expect(agentModes(state).nexo).toBe("idle");
  });

  it("pedido de ajuste: o run novo do especialista diz \"ajustando\"", () => {
    seq = 0;
    const state = reduce(initialLiveState(WS), [
      { type: "run_linked", workspaceId: WS, runId: "run-2", conversationId: CONV, workItemId: "wi-1", revision: true },
      runEvent(ev("agent.thinking", { agent_id: "otto", step: "otto.produce" }, 2, "run-2")),
    ]);
    expect(conversationLive(state, CONV)).toMatchObject({ lead: "otto", detail: "adjusting" });
  });
});
