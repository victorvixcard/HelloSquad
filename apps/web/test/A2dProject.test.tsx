import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CoordinatedWork, type CoordinatedStep, type CoordinatedWorkData } from "@/components/env/projects/CoordinatedWork";
import { TeamCard } from "@/components/product/TeamCard";
import { CAPABILITIES } from "@/lib/capabilities";
import { isDocumentDelivery, requestOwner } from "@/lib/delivery-types";
import { deliveryForRequest } from "@/lib/live/request";
import { makeShell, renderWithShell } from "./render";

// A2d (H2-01): o projeto coordenado no web. O pedido de campanha na Sala do Squad (ou com o Nexo) vira o 01.02 da
// S2d; "Coordenar uma campanha" é do Nexo; o cartão da equipe e a tela do projeto mostram um responsável por etapa,
// a decisão só na etapa que espera a pessoa e a Kaia aguardando o motor sem botão.

describe("pedido que vira o projeto coordenado", () => {
  it("campanha na Sala do Squad ou com o Nexo vira 01.02, nos três idiomas", () => {
    expect(deliveryForRequest("Quero uma campanha de Natal para vender mais panetones.", { coordinator: true })).toBe("01.02");
    expect(deliveryForRequest("I want a Christmas campaign.", { coordinator: true })).toBe("01.02");
    expect(deliveryForRequest("Quiero una campaña de Navidad.", { coordinator: true })).toBe("01.02");
    expect(deliveryForRequest("Campanhas de fim de ano", { coordinator: true })).toBe("01.02");
  });

  it("fora da Sala e do Nexo, campanha não vira trabalho de ninguém; a legenda segue com o Otto", () => {
    expect(deliveryForRequest("Quero uma campanha de Natal.")).toBeNull();
    expect(deliveryForRequest("Quero uma legenda para o sábado.")).toBe("04.01");
    expect(deliveryForRequest("Quero uma legenda para o sábado.", { coordinator: true })).toBe("04.01");
    expect(deliveryForRequest("Campanhamento", { coordinator: true })).toBeNull();
  });

  it("Coordenar uma campanha é do Nexo (01.02), não da Bia; 01.02 não é documento", () => {
    const camp = CAPABILITIES.nexo.find((c) => c.id === "n-camp");
    expect(camp?.code).toBe("01.02");
    expect(requestOwner("01.02")).toBe("nexo");
    expect(requestOwner("02.04")).toBe("bia");
    expect(isDocumentDelivery("01.02")).toBe(false);
  });
});

describe("cartão da equipe (V4.6 L5541)", () => {
  it("mostra quem o Nexo chamou, com a responsabilidade, e abre o projeto", async () => {
    const shell = makeShell();
    renderWithShell(
      <TeamCard
        members={[
          { agent_id: "bia", responsibility: "estratégia e conceito" },
          { agent_id: "kaia", responsibility: "peças da campanha" },
          { agent_id: "otto", responsibility: "legendas e roteiros" },
        ]}
        workItemId="wi-camp"
      />,
      shell,
    );
    expect(screen.getByText("Squad da campanha · o Nexo coordena")).toBeInTheDocument();
    for (const [name, role] of [
      ["Bia", "estratégia e conceito"],
      ["Kaia", "peças da campanha"],
      ["Otto", "legendas e roteiros"],
    ]) {
      expect(screen.getByText(name).parentElement).toHaveTextContent(role);
    }
    expect(screen.getByRole("button", { name: "Abrir o projeto" })).toBeInTheDocument();
  });
});

const STEP = (over: Partial<CoordinatedStep>): CoordinatedStep => ({
  seq: 1,
  title: "Estratégia",
  agent: "bia",
  status: "pending",
  responsibility: "estratégia e conceito",
  reason: null,
  dependsOn: [],
  version: null,
  approvalId: null,
  approved: false,
  ...over,
});

const BASE: CoordinatedWorkData = {
  workItemId: "wi-camp",
  conversationId: "room-1",
  room: true,
  name: "Campanha de Natal",
  goal: "Vender mais panetones no Natal.",
  origin: "pedido na Sala do Squad · 16/10",
  envHref: "/app/miolo/squad/nexo",
  envLabel: "Projetos",
  steps: [],
  history: [{ agent: "nexo", text: "Nexo montou a equipe: Bia, Kaia e Otto", at: "hoje · 20:03" }],
};

describe("tela do projeto coordenado", () => {
  it("Bia em revisão: só a etapa dela pede decisão; as outras esperam a estratégia", async () => {
    const decide = vi.fn().mockResolvedValue({ ok: true, data: { decision: "approved" } });
    const data = {
      ...BASE,
      steps: [
        STEP({ status: "needs_you", version: { no: 1, excerpt: "A campanha fala com quem já compra na Miolo." }, approvalId: "ap-bia" }),
        STEP({ seq: 2, title: "Peças", agent: "kaia", responsibility: "peças da campanha", dependsOn: [1] }),
        STEP({ seq: 3, title: "Textos", agent: "otto", responsibility: "legendas e roteiros", dependsOn: [1] }),
      ],
    };
    renderWithShell(<CoordinatedWork data={data} decide={decide} />);
    expect(screen.getByRole("heading", { level: 1, name: "Campanha de Natal" })).toBeInTheDocument();
    expect(screen.getByText("projeto coordenado")).toBeInTheDocument();
    expect(screen.getByText("Vender mais panetones no Natal.")).toBeInTheDocument();
    const stages = within(screen.getByRole("list", { name: "Etapas do projeto" })).getAllByRole("listitem");
    expect(stages.map((s) => s.getAttribute("aria-label"))).toEqual([
      "Etapa 1 · Estratégia · Bia · v1 aguarda você",
      "Etapa 2 · Peças · Kaia · Peças da campanha",
      "Etapa 3 · Textos · Otto · Legendas e roteiros",
    ]);
    expect(screen.getAllByRole("button", { name: /^Aprovar v\d$/ })).toHaveLength(1);
    expect(screen.getAllByText("Começa depois da etapa Estratégia.")).toHaveLength(2);
    expect(screen.getByText("Aprovar a etapa Estratégia")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Aprovar v1" }));
    expect(decide).toHaveBeenCalledWith("ap-bia", "approved");
  });

  it("Kaia aguarda o motor sem botão e sem travar o Otto, que espera a decisão", () => {
    const data = {
      ...BASE,
      steps: [
        STEP({ status: "done", version: { no: 1, excerpt: "Estratégia aprovada." }, approved: true }),
        STEP({ seq: 2, title: "Peças", agent: "kaia", status: "waiting_engine", reason: "Aguardando o motor de imagem", dependsOn: [1] }),
        STEP({ seq: 3, title: "Textos", agent: "otto", status: "needs_you", version: { no: 1, excerpt: "Sábado de manhã…" }, approvalId: "ap-otto", dependsOn: [1] }),
      ],
    };
    renderWithShell(<CoordinatedWork data={data} decide={vi.fn()} />);
    const kaia = screen.getByRole("listitem", { name: /^Etapa 2 · Peças · Kaia/ });
    expect(kaia).toHaveAccessibleName("Etapa 2 · Peças · Kaia · Aguardando o motor de imagem");
    const entry = document.querySelector('.ps-ent[data-step="2"]') as HTMLElement;
    expect(entry).toHaveTextContent("Nada é gerado nem cobrado até o motor chegar");
    expect(within(entry).queryAllByRole("button")).toHaveLength(0);
    const otto = document.querySelector('.ps-ent[data-step="3"]') as HTMLElement;
    expect(within(otto).getByRole("button", { name: "Aprovar v1" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Aprovar v\d$/ })).toHaveLength(1);
  });

  it("fechado: nenhuma decisão pendente, um responsável por etapa no Squad e as decisões aprovadas", async () => {
    const data = {
      ...BASE,
      steps: [
        STEP({ status: "done", version: { no: 1, excerpt: "Estratégia." }, approved: true }),
        STEP({ seq: 2, title: "Peças", agent: "kaia", status: "waiting_engine", reason: "Aguardando o motor de imagem", responsibility: "peças da campanha" }),
        STEP({ seq: 3, title: "Textos", agent: "otto", status: "done", version: { no: 1, excerpt: "Textos." }, approved: true, responsibility: "legendas e roteiros" }),
      ],
    };
    renderWithShell(<CoordinatedWork data={data} decide={vi.fn()} />);
    expect(screen.queryAllByRole("button", { name: /^Aprovar v\d$/ })).toHaveLength(0);
    expect(screen.getByText("Nenhuma decisão pendente")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Decisões" }));
    expect(screen.getByText("Estratégia aprovada")).toBeInTheDocument();
    expect(screen.getByText("Textos aprovada")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Squad" }));
    expect(screen.getByText("coordena e acompanha")).toBeInTheDocument();
    const kaia = screen.getByText("peças da campanha").closest(".ps-lr") as HTMLElement;
    expect(kaia).toHaveTextContent("Kaia");
    expect(kaia).toHaveTextContent("Aguardando o motor de imagem");
  });

  it("rejeitar tem as duas saídas na etapa: nova proposta ou cancelar o trabalho", async () => {
    const decide = vi.fn().mockResolvedValue({ ok: true, data: { decision: "rejected" } });
    const data = { ...BASE, steps: [STEP({ status: "needs_you", version: { no: 1, excerpt: "Estratégia." }, approvalId: "ap-bia" })] };
    renderWithShell(<CoordinatedWork data={data} decide={decide} />);
    await userEvent.click(screen.getByRole("button", { name: "Pedir nova proposta" }));
    expect(decide).toHaveBeenCalledWith("ap-bia", "rejected", undefined, "revise");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar trabalho" }));
    expect(decide).toHaveBeenCalledWith("ap-bia", "rejected", undefined, "cancel");
  });

  it("cancelado: nenhuma decisão e o aviso de trabalho cancelado", () => {
    const data = {
      ...BASE,
      cancelled: true,
      steps: [STEP({ status: "skipped" }), STEP({ seq: 2, title: "Peças", agent: "kaia", status: "skipped" })],
    };
    renderWithShell(<CoordinatedWork data={data} decide={vi.fn()} />);
    expect(screen.queryAllByRole("button", { name: /^Aprovar v\d$/ })).toHaveLength(0);
    expect(screen.getByText("Trabalho cancelado")).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: /^Etapa 2 · Peças · Kaia/ })).toHaveAccessibleName("Etapa 2 · Peças · Kaia · Não feita");
  });

  it("pedir ajuste abre a conversa do pedido (Sala do Squad) com o texto do ajuste", async () => {
    const openConversation = vi.fn();
    const shell = makeShell({ openConversation });
    const data = { ...BASE, steps: [STEP({ status: "needs_you", version: { no: 1, excerpt: "Estratégia." }, approvalId: "ap-bia" })] };
    renderWithShell(<CoordinatedWork data={data} decide={vi.fn()} />, shell);
    await userEvent.click(screen.getByRole("button", { name: "Pedir ajuste" }));
    expect(openConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "room-1",
        room: true,
        agent: null,
        draft: "Quero pedir um ajuste nesta versão.",
        adjust: { approvalId: "ap-bia", workItemId: "wi-camp", version: 1 },
      }),
    );
  });
});
