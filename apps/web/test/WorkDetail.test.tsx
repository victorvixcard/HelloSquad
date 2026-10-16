import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DeliveryDetail, type DeliveryDetailData } from "@/components/env/DeliveryDetail";
import { originOf, workEvents } from "@/components/env/projects/work-history";
import type { WorkItemDetail } from "@/lib/core";
import { makeShell, renderWithShell } from "./render";

const MARINA = "user-marina";

// O trabalho do seed depois de um ciclo: pedido na conversa com o Otto, v1, ajuste pedido, v2 aprovada.
const ITEM = {
  id: "wi-1",
  workspace_id: "ws-1",
  project_id: null,
  conversation_id: "otto-1",
  origin_message_id: "m-1",
  title: "Legenda do post de sábado: pão de fermentação longa",
  delivery_type: "04.01",
  status: "approved",
  primary_agent_id: "otto",
  collaborator_agent_ids: ["kaia"],
  created_by: MARINA,
  created_at: "2026-10-15T13:14:00Z",
  updated_at: "2026-10-16T13:00:00Z",
  briefing: {},
  steps: [],
  deliveries: [
    {
      id: "d-1",
      kind: "caption",
      current_version_id: "v-2",
      created_at: "2026-10-15T13:16:00Z",
      updated_at: "2026-10-16T12:00:00Z",
      versions: [
        { id: "v-1", version_no: 1, status: "superseded", content: {}, created_by_type: "agent", created_by_user_id: null, created_by_agent_id: "otto", run_id: "r-1", change_note: "Primeira versão.", created_at: "2026-10-15T13:16:00Z", files: [] },
        { id: "v-2", version_no: 2, status: "approved", content: {}, created_by_type: "agent", created_by_user_id: null, created_by_agent_id: "otto", run_id: "r-2", change_note: null, created_at: "2026-10-16T12:00:00Z", files: [] },
      ],
    },
  ],
  approvals: [
    { id: "ap-1", status: "decided", decision: "changes_requested", follow_up: null, note: "Mais curto, por favor.", decided_at: "2026-10-16T11:00:00Z", delivery_version_no: 1 },
    { id: "ap-2", status: "decided", decision: "approved", follow_up: null, note: null, decided_at: "2026-10-16T13:00:00Z", delivery_version_no: 2 },
    { id: "ap-3", status: "pending", decision: null, follow_up: null, note: null, decided_at: null, delivery_version_no: 3 },
  ],
  runs: [
    { id: "r-1", agent_id: "otto", kind: "interactive", status: "succeeded", created_at: "2026-10-15T13:14:00Z", started_at: "2026-10-15T13:14:05Z", finished_at: "2026-10-15T13:16:00Z" },
    { id: "r-2", agent_id: "otto", kind: "interactive", status: "failed", created_at: "2026-10-16T11:00:00Z", started_at: "2026-10-16T11:00:05Z", finished_at: "2026-10-16T11:30:00Z" },
  ],
} as unknown as WorkItemDetail;

const DATA: DeliveryDetailData = {
  workItemId: "wi-1",
  conversationId: "otto-1",
  title: "Legenda do post de sábado: pão de fermentação longa",
  agent: "otto",
  envHref: "/app/miolo/squad/nexo",
  envLabel: "Projetos",
  origin: "pedido na conversa com o Otto · 15/10",
  typeLabel: "Legenda",
  channel: "Instagram",
  version: { no: 1, caption: "Sábado tem pão de fermentação longa saindo do forno.", hashtags: [], at: "15/10", note: "Primeira versão." },
  versions: [{ no: 1, at: "15/10" }],
  approval: { id: "ap-1", status: "pending", decision: null },
  brief: [],
  history: [
    { agent: "otto", text: "v1 entregue", at: "15/10 · 10:16" },
    { agent: "otto", text: "Otto começou a trabalhar nisso", at: "15/10 · 10:14" },
    { agent: null, text: "Você pediu na conversa com o Otto", at: "15/10 · 10:14" },
  ],
  team: { agents: ["otto", "kaia"], label: "Otto com a Kaia" },
};

describe("Detalhe do trabalho (A1b)", () => {
  it("origem da conversa do pedido: conversa com o especialista, Sala do Squad ou o ambiente", () => {
    expect(originOf(ITEM, { kind: "agent_direct", primary_agent_id: "otto" })).toEqual({ where: "direct", agent: "otto", at: ITEM.created_at });
    expect(originOf(ITEM, { kind: "squad_room", primary_agent_id: "nexo" })).toEqual({ where: "room", agent: null, at: ITEM.created_at });
    expect(originOf(ITEM, null)).toEqual({ where: "plain", agent: "otto", at: ITEM.created_at });
  });

  it("histórico só com o que a API devolve, do mais recente para o mais antigo", () => {
    const events = workEvents(ITEM, originOf(ITEM, { kind: "agent_direct", primary_agent_id: "otto" }), MARINA);
    expect(events.map((e) => e.kind + ("version" in e && e.version ? e.version : "") + ("decision" in e ? ":" + e.decision : ""))).toEqual([
      "decided2:approved",
      "delivered2",
      "failed",
      "started",
      "decided1:changes_requested",
      "delivered1",
      "started",
      "asked",
    ]);
    const adjust = events.find((e) => e.kind === "decided" && e.decision === "changes_requested");
    expect(adjust).toMatchObject({ note: "Mais curto, por favor." });
    // Pendência ainda aberta não entra no histórico; o pedido é "Você" só para quem pediu.
    expect(events.filter((e) => e.kind === "decided")).toHaveLength(2);
    expect(workEvents(ITEM, originOf(ITEM, null), "outra-pessoa").some((e) => e.kind === "asked")).toBe(false);
  });

  it("o voltar leva ao ambiente de origem (Projetos) e o cabeçalho mostra origem e time", () => {
    renderWithShell(<DeliveryDetail data={DATA} decide={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Projetos" })).toHaveAttribute("href", "/app/miolo/squad/nexo");
    expect(screen.getByText("pedido na conversa com o Otto · 15/10")).toBeInTheDocument();
    expect(screen.getByText("Otto com a Kaia", { selector: ".hs-stack span" })).toBeInTheDocument();
    expect(document.querySelectorAll(".hs-stack-av svg, .hs-stack-av [class*=hs-ag]").length).toBeGreaterThan(0);
  });

  it("Histórico mostra o que a página montou da API, com quem fez e quando", async () => {
    const user = userEvent.setup();
    renderWithShell(<DeliveryDetail data={DATA} decide={vi.fn()} />);
    await user.click(screen.getByRole("tab", { name: "Histórico" }));
    const rows = [...document.querySelectorAll(".ps-hist .ps-hi")].map((r) => r.textContent);
    expect(rows).toEqual(["v1 entregue15/10 · 10:16", "Otto começou a trabalhar nisso15/10 · 10:14", "MVocê pediu na conversa com o Otto15/10 · 10:14"]);
  });

  it("Conversar abre a conversa do trabalho (a do pedido) no painel, com o trabalho em contexto", async () => {
    const user = userEvent.setup();
    const shell = makeShell({ workConversations: { "wi-1": "obj-9" } });
    renderWithShell(<DeliveryDetail data={DATA} decide={vi.fn()} />, shell);
    await user.click(screen.getByRole("button", { name: "Conversar com o Otto" }));
    expect(shell.openConversation).toHaveBeenCalledWith({
      conversationId: "obj-9",
      agent: "otto",
      context: { kind: "work_item", label: DATA.title, origin: DATA.origin },
    });
  });

  it("trabalho de projeto mostra o link do projeto (V4.3 ps-pjl)", () => {
    renderWithShell(<DeliveryDetail data={{ ...DATA, project: { name: "Campanha de Natal", href: "/app/miolo/squad/nexo" } }} decide={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Campanha de Natal" })).toHaveAttribute("href", "/app/miolo/squad/nexo");
  });
});
