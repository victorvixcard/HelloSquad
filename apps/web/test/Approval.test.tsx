import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DeliveryDetail, type DeliveryDetailData } from "@/components/env/DeliveryDetail";
import { NeedsStrip } from "@/components/env/NeedsStrip";
import { makeShell, renderWithShell } from "./render";

const DATA: DeliveryDetailData = {
  workItemId: "wi-1",
  conversationId: "otto-1",
  title: "Legenda do post de sábado: pão de fermentação longa",
  agent: "otto",
  envHref: "/app/miolo/squad/otto",
  envLabel: "Conteúdo",
  origin: "pedido na conversa com o Otto · 15/10",
  typeLabel: "Legenda",
  channel: "Instagram",
  version: { no: 1, caption: "Sábado tem pão de fermentação longa saindo do forno.", hashtags: ["#pinheiros"], at: "15/10", note: "Primeira versão." },
  versions: [{ no: 1, at: "15/10" }],
  approval: { id: "ap-1", status: "pending", decision: null },
  brief: [{ k: "Tom", v: "acolhedor, direto, sem gíria" }],
  history: [],
};

function approval(decision: "approved" | "changes_requested" | "rejected", follow_up: "cancel" | "revise" | null = null) {
  return { ok: true as const, data: { id: "ap-1", status: "decided", decision, follow_up } as never };
}

describe("Precisa de você", () => {
  it("a faixa diz quem pede, o tipo de decisão, o quê e a ação", () => {
    renderWithShell(
      <NeedsStrip
        items={[
          { approvalId: "ap-1", agent: "otto", kind: "Para você revisar", title: DATA.title, sub: "Legenda, versão 1, aguarda a sua revisão", cta: "Revisar a legenda", href: "/x" },
        ]}
      />,
    );
    expect(screen.getByRole("region", { name: "Precisa de você: 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Otto · Para você revisar: ${DATA.title}. Revisar a legenda` })).toBeInTheDocument();
  });

  it("com mais de uma pendência, a primeira aparece e +N abre as outras no mesmo formato (V4.6 _vNd5)", async () => {
    const user = userEvent.setup();
    const { container } = renderWithShell(
      <NeedsStrip
        items={[
          { approvalId: "ap-1", agent: "otto", kind: "Para você revisar", title: "Legenda do sábado", sub: "Legenda, versão 1, aguarda a sua revisão", cta: "Revisar a legenda", href: "/a" },
          { approvalId: "ap-2", agent: "otto", kind: "Para você revisar", title: "Legenda de domingo", sub: "Legenda, versão 1, aguarda a sua revisão", cta: "Revisar a legenda", href: "/b" },
        ]}
      />,
    );
    expect(screen.getByRole("region", { name: "Precisa de você: 2" })).toBeInTheDocument();
    const more = screen.getByRole("button", { name: "Ver mais 1 pendência" });
    expect(more).toHaveTextContent("+1");
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(container.querySelector(".v41-more")).not.toHaveClass("is-open");
    await user.click(more);
    const less = screen.getByRole("button", { name: "Recolher as outras pendências" });
    expect(less).toHaveTextContent("Fechar");
    expect(less).toHaveAttribute("aria-expanded", "true");
    expect(container.querySelector(".v41-more")).toHaveClass("is-open");
    expect(screen.getByRole("button", { name: "Otto · Para você revisar: Legenda de domingo. Revisar a legenda" })).toBeInTheDocument();
  });

  it("sem pendência, sem faixa", () => {
    const { container } = renderWithShell(<NeedsStrip items={[]} />);
    expect(container.querySelector(".nd")).toBeNull();
  });

  it("Aprovar chama POST /approvals/{id}/decision com approved e não publica nada", async () => {
    const user = userEvent.setup();
    const decide = vi.fn(async () => approval("approved"));
    renderWithShell(<DeliveryDetail data={DATA} decide={decide} />);
    expect(screen.getByText("Otto aguarda você")).toBeInTheDocument();
    expect(screen.getByText("Primeira versão.")).toBeInTheDocument();
    expect(screen.getByText("Sua aprovação")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Aprovar v1/ }));
    await waitFor(() => expect(decide).toHaveBeenCalledWith("ap-1", "approved"));
    expect(await screen.findByText("v1 aprovada")).toBeInTheDocument();
    expect(await screen.findByText("Aprovada por você")).toBeInTheDocument();
    expect(screen.getByText(/Aprovar não publica/)).toBeInTheDocument();
  });

  it("Pedir ajuste abre a conversa com o texto do protótipo no campo; a decisão só vai no envio", async () => {
    const user = userEvent.setup();
    const decide = vi.fn(async () => approval("changes_requested"));
    const shell = makeShell();
    renderWithShell(<DeliveryDetail data={DATA} decide={decide} />, shell);
    await user.click(screen.getByRole("button", { name: "Pedir ajuste" }));
    expect(shell.openConversation).toHaveBeenCalledWith({
      conversationId: "otto-1",
      agent: "otto",
      // O cartão de contexto leva a origem do trabalho (V4.6 `_vRail`: "Origem").
      context: { kind: "work_item", label: DATA.title, origin: DATA.origin },
      draft: "Quero pedir um ajuste nesta versão.",
      adjust: { approvalId: "ap-1", workItemId: DATA.workItemId, version: 1 },
    });
    // Dono, 16/10 10:20: é o envio da mensagem que registra changes_requested (ConversationPanel.test).
    expect(decide).not.toHaveBeenCalled();
  });

  it("falha da API aparece em português, sem perder a revisão", async () => {
    const user = userEvent.setup();
    const decide = vi.fn(async () => ({ ok: false as const, code: "network_error", message: "x" }));
    renderWithShell(<DeliveryDetail data={DATA} decide={decide} />);
    await user.click(screen.getByRole("button", { name: /Aprovar v1/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível registrar a sua decisão agora.");
    expect(screen.getByText("Otto aguarda você")).toBeInTheDocument();
  });

  it("rejeitar tem duas saídas: Pedir nova proposta devolve ao agente (follow_up revise)", async () => {
    const user = userEvent.setup();
    const decide = vi.fn(async () => approval("rejected", "revise"));
    const shell = makeShell();
    renderWithShell(<DeliveryDetail data={DATA} decide={decide} />, shell);
    await user.click(screen.getByRole("button", { name: "Pedir nova proposta" }));
    await waitFor(() => expect(decide).toHaveBeenCalledWith("ap-1", "rejected", undefined, "revise"));
    expect(await screen.findByText("Otto criando uma nova proposta")).toBeInTheDocument();
    expect(screen.getByText("Você recebe a nova versão aqui e na conversa.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Aprovar v1/ })).toBeNull();
    expect(shell.openConversation).not.toHaveBeenCalled();
  });

  it("rejeitar tem duas saídas: Cancelar trabalho encerra (follow_up cancel)", async () => {
    const user = userEvent.setup();
    const decide = vi.fn(async () => approval("rejected", "cancel"));
    renderWithShell(<DeliveryDetail data={DATA} decide={decide} />);
    await user.click(screen.getByRole("button", { name: "Cancelar trabalho" }));
    await waitFor(() => expect(decide).toHaveBeenCalledWith("ap-1", "rejected", undefined, "cancel"));
    expect(await screen.findByText("Trabalho cancelado")).toBeInTheDocument();
    expect(screen.getByText("Otto não segue com esta entrega.")).toBeInTheDocument();
  });

  it("depois de pedir ajuste (o servidor já registrou), a decisão mostra o agente trabalhando na nova versão", () => {
    const data = { ...DATA, approval: { id: "ap-1", status: "decided" as const, decision: "changes_requested" } };
    renderWithShell(<DeliveryDetail data={data} />);
    expect(screen.getByText("Otto ajustando a versão 1")).toBeInTheDocument();
    expect(screen.getByText("Você recebe a nova versão aqui e na conversa.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Aprovar v1/ })).toBeNull();
  });

  it("quem não é o dono da conta vê a pendência em modo leitura, sem botões de decisão", () => {
    const decide = vi.fn();
    renderWithShell(<DeliveryDetail data={DATA} decide={decide} />, makeShell({ canDecide: false }));
    expect(screen.getByText("Otto aguarda a decisão")).toBeInTheDocument();
    expect(screen.getByText("Quem decide é o dono da conta")).toBeInTheDocument();
    for (const name of [/Aprovar v1/, "Pedir ajuste", "Pedir nova proposta", "Cancelar trabalho"]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
    expect(screen.getByText(DATA.version!.caption, { selector: ".ps-mesa .ps-caption" })).toBeInTheDocument();
    expect(decide).not.toHaveBeenCalled();
  });

  it("na faixa, quem não é o dono da conta vê a pendência sem a ação de decidir", () => {
    renderWithShell(
      <NeedsStrip
        items={[{ approvalId: "ap-1", agent: "otto", kind: "Para você revisar", title: DATA.title, sub: "Legenda, versão 1", cta: "Revisar a legenda", href: "/x" }]}
      />,
      makeShell({ canDecide: false }),
    );
    expect(screen.getByRole("button", { name: `Otto · Para você revisar: ${DATA.title}. Quem decide é o dono da conta` })).toBeInTheDocument();
    expect(screen.queryByText("Revisar a legenda")).toBeNull();
  });

  it("o dono da conta vê as quatro decisões da entrega", () => {
    renderWithShell(<DeliveryDetail data={DATA} decide={vi.fn()} />);
    for (const name of [/Aprovar v1/, "Pedir ajuste", "Pedir nova proposta", "Cancelar trabalho"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.queryByText("Quem decide é o dono da conta")).toBeNull();
  });
});
