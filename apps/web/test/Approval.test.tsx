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
  version: { no: 1, caption: "Sábado tem pão de fermentação longa saindo do forno.", hashtags: ["#pinheiros"], at: "15/10" },
  versions: [{ no: 1, at: "15/10" }],
  approval: { id: "ap-1", status: "pending", decision: null },
  brief: [{ k: "Tom", v: "acolhedor, direto, sem gíria" }],
  history: [],
};

function approval(decision: "approved" | "changes_requested") {
  return { ok: true as const, data: { id: "ap-1", status: "decided", decision } as never };
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

  it("sem pendência, sem faixa", () => {
    const { container } = renderWithShell(<NeedsStrip items={[]} />);
    expect(container.querySelector(".nd")).toBeNull();
  });

  it("Aprovar chama POST /approvals/{id}/decision com approved e não publica nada", async () => {
    const user = userEvent.setup();
    const decide = vi.fn(async () => approval("approved"));
    renderWithShell(<DeliveryDetail data={DATA} decide={decide} />);
    expect(screen.getByText("Otto aguarda você")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Aprovar v1/ }));
    await waitFor(() => expect(decide).toHaveBeenCalledWith("ap-1", "approved"));
    expect(await screen.findByText("Aprovada por você")).toBeInTheDocument();
    expect(screen.getByText(/Aprovar não publica/)).toBeInTheDocument();
  });

  it("Pedir ajuste registra changes_requested e abre a conversa ao lado sobre o trabalho", async () => {
    const user = userEvent.setup();
    const decide = vi.fn(async () => approval("changes_requested"));
    const shell = makeShell();
    renderWithShell(<DeliveryDetail data={DATA} decide={decide} />, shell);
    await user.click(screen.getByRole("button", { name: "Pedir ajuste" }));
    await waitFor(() => expect(decide).toHaveBeenCalledWith("ap-1", "changes_requested"));
    expect(shell.openConversation).toHaveBeenCalledWith({
      conversationId: "otto-1",
      agent: "otto",
      context: { kind: "work_item", label: DATA.title },
    });
  });

  it("falha da API aparece em português, sem perder a revisão", async () => {
    const user = userEvent.setup();
    const decide = vi.fn(async () => ({ ok: false as const, code: "network_error", message: "x" }));
    renderWithShell(<DeliveryDetail data={DATA} decide={decide} />);
    await user.click(screen.getByRole("button", { name: /Aprovar v1/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível registrar a sua decisão agora.");
    expect(screen.getByText("Otto aguarda você")).toBeInTheDocument();
  });
});
