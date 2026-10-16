import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HomeView } from "@/components/home/HomeView";
import { makeShell, renderWithShell } from "./render";

// O palco tem motor próprio (extraído do protótipo e testado no @hellosquad/ui); aqui só a composição.
vi.mock("@/components/home/SquadStage", () => ({ SquadStage: () => <div className="hm-stage" /> }));

const needs = [
  {
    approvalId: "ap-1",
    agent: "otto" as const,
    title: "Legenda do post de sábado: pão de fermentação longa",
    kindLabel: "Para você revisar",
    cta: "Revisar a legenda",
    href: "/app/miolo/squad/otto/trabalho/wi-1",
  },
];

function actions() {
  return {
    send: vi.fn(async (_id: string, body: string) => ({ ok: true as const, data: { id: "m1", body } as never })),
    create: vi.fn(async () => ({ ok: true as const, data: { id: "nova" } })),
    createWork: vi.fn(async () => ({ ok: true as const, data: { workItemId: "wi-1", runId: "run-1", conversationId: "otto-1" } })),
    decide: vi.fn(async () => ({ ok: true as const, data: {} as never })),
  };
}

describe("Início V3", () => {
  it("saudação, pergunta, quem participa (os sete) e os resumos com dados reais", () => {
    renderWithShell(<HomeView firstName="Marina" business="Miolo" needs={needs} inProgress={[]} actions={actions()} />);
    expect(screen.getByText("Hello, Marina.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Com o que vamos trabalhar hoje?");
    const who = screen.getByRole("toolbar", { name: /Quem participa/ });
    expect(within(who).getAllByRole("button")).toHaveLength(7);
    expect(screen.getByRole("button", { name: /^Trabalhos: Nada em andamento, 1 aguarda você/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^O Squad percebeu: Nada para confirmar agora/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Modo Autônomo: Delegue o que se repete/ })).toBeInTheDocument();
  });

  it("escolher um especialista vira conversa direta; o envio vai para a conversa dele e abre o painel", async () => {
    const user = userEvent.setup();
    const acts = actions();
    const shell = makeShell();
    renderWithShell(<HomeView firstName="Marina" business="Miolo" needs={needs} inProgress={[]} actions={acts} />, shell);
    await user.click(screen.getByRole("button", { name: /^Otto, Conteúdo, participa com o squad/ }));
    expect(screen.getByText("Conversa direta com o Otto")).toBeInTheDocument();
    const field = screen.getByRole("textbox", { name: "Pedido para o Otto" });
    await user.type(field, "Uma legenda para domingo{Enter}");
    await waitFor(() => expect(acts.send).toHaveBeenCalledWith("otto-1", "Uma legenda para domingo"));
    expect(shell.openConversation).toHaveBeenCalledWith({ conversationId: "otto-1", agent: "otto" }, "panel");
    // Pedido de legenda (entrega 04.01, a que o squad executa na Fase 1) vira trabalho com run na fila.
    await waitFor(() => expect(acts.createWork).toHaveBeenCalledWith("m1", "04.01", "Uma legenda para domingo"));
  });

  it("o squad inteiro escreve na Sala do Squad", async () => {
    const user = userEvent.setup();
    const acts = actions();
    renderWithShell(<HomeView firstName="Marina" business="Miolo" needs={[]} inProgress={[]} actions={acts} />);
    await user.type(screen.getByRole("textbox", { name: "Pedido para a Sala do Squad" }), "Bom dia{Enter}");
    await waitFor(() => expect(acts.send).toHaveBeenCalledWith("room-1", "Bom dia"));
    // Mensagem que não pede uma entrega fica só como mensagem: nenhum trabalho, nenhuma resposta inventada.
    expect(acts.createWork).not.toHaveBeenCalled();
  });

  it("abrir Trabalhos mostra a decisão pendente com a ação; recolher os resumos avisa que há decisão", async () => {
    const user = userEvent.setup();
    renderWithShell(<HomeView firstName="Marina" business="Miolo" needs={needs} inProgress={[]} actions={actions()} />);
    await user.click(screen.getByRole("button", { name: /^Trabalhos:/ }));
    expect(screen.getByText(/Hoje, uma decisão é sua/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Revisar a legenda: ${needs[0].title}` })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Recolher resumos e ficar só com o squad" }));
    expect(screen.getByRole("button", { name: "Mostrar resumos. Uma decisão aguarda você" })).toHaveAttribute("aria-expanded", "false");
  });
});
