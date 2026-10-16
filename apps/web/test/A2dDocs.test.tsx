import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DocumentDetail, type DocumentDetailData } from "@/components/env/docs/DocumentDetail";
import type { DeliveryType } from "@/lib/delivery-types";
import { makeShell, renderWithShell } from "./render";

/** Documento revisável (A2d, P-11 a P-13): cartão da decisão, migalha, rótulo da conversa e card "Versões" da V4.4. */
function doc(type: DeliveryType, over: Partial<DocumentDetailData> = {}): DocumentDetailData {
  return {
    workItemId: "w-1",
    conversationId: "c-1",
    title: "Quero analisar meu negócio",
    agent: "bia",
    envHref: "/app/miolo/squad/bia",
    envLabel: "Estratégia",
    origin: "pedido na conversa com a Bia · 16/10",
    type,
    typeLabel: "Diagnóstico",
    approveLabel: "Aprovar o diagnóstico",
    versions: [
      { no: 1, at: "09/10", status: "superseded", note: "Primeira versão.", content: { titulo: "Diagnóstico de marketing da Miolo" } },
      { no: 2, at: "16/10", status: "draft", note: "Ajustei o público.", content: { titulo: "Diagnóstico de marketing da Miolo" } },
    ],
    approval: { id: "ap-1", status: "pending", decision: null },
    history: [],
    ...over,
  };
}

describe("DocumentDetail (A2d)", () => {
  it("P-11: diagnóstico pendente traz a regra da V4.4 e não o texto da legenda", () => {
    renderWithShell(<DocumentDetail data={doc("02.01")} decide={vi.fn()} />);
    expect(screen.getByText("Aprovar o diagnóstico não cria trabalhos: cada recomendação vira ação quando você pedir.")).toBeInTheDocument();
    expect(screen.queryByText(/com a legenda à vista/)).toBeNull();
    expect(screen.queryByText("Ajustei o público.")).toBeNull();
  });

  it("P-11: plano pendente e aprovado com os textos do plano", () => {
    const { unmount } = renderWithShell(<DocumentDetail data={doc("02.03")} decide={vi.fn()} />);
    expect(screen.getByText("Aprovar o plano define a direção. Cada iniciativa vira trabalho só quando você pedir.")).toBeInTheDocument();
    unmount();
    const approved = doc("02.03", {
      versions: [{ no: 1, at: "16/10", status: "approved", note: null, content: { titulo: "Plano de marketing" } }],
      approval: { id: "ap-1", status: "decided", decision: "approved" },
    });
    renderWithShell(<DocumentDetail data={approved} decide={vi.fn()} />);
    expect(screen.getByText("Aprovado por você. O Nexo organiza a execução das iniciativas.")).toBeInTheDocument();
    expect(screen.queryByText(/Aprovar não publica/)).toBeNull();
  });

  it("P-11: outro documento aprovado fica no 'Aprovado por você.' genérico, sem texto da legenda", () => {
    const approved = doc("07.03", {
      agent: "iris",
      versions: [{ no: 1, at: "16/10", status: "approved", note: null, content: {} }],
      approval: { id: "ap-1", status: "decided", decision: "approved" },
    });
    renderWithShell(<DocumentDetail data={approved} decide={vi.fn()} />);
    expect(screen.getByText("Aprovado por você.")).toBeInTheDocument();
    expect(screen.queryByText(/Aprovar não publica/)).toBeNull();
  });

  it("P-12: migalha e h1 com o título do documento; botão 'Conversar sobre o diagnóstico'", async () => {
    const shell = makeShell();
    renderWithShell(<DocumentDetail data={doc("02.01")} decide={vi.fn()} />, shell);
    const crumb = screen.getByRole("navigation");
    expect(within(crumb).getByText("Diagnóstico de marketing da Miolo")).toBeInTheDocument();
    expect(within(crumb).queryByText("Quero analisar meu negócio")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Diagnóstico de marketing da Miolo");
    await userEvent.click(screen.getByRole("button", { name: "Conversar sobre o diagnóstico" }));
    expect(shell.openConversation).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Conversar com a Bia" })).toBeNull();
  });

  it("P-12: plano com 'Conversar sobre as prioridades'; documento sem rótulo no protótipo mantém 'Conversar com'", () => {
    const { unmount } = renderWithShell(<DocumentDetail data={doc("02.02")} decide={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Conversar sobre as prioridades" })).toBeInTheDocument();
    unmount();
    renderWithShell(<DocumentDetail data={doc("04.02", { agent: "otto" })} decide={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Conversar com o Otto" })).toBeInTheDocument();
  });

  it("P-13: cada versão numa linha da largura do card, a aberta com is-cur", async () => {
    renderWithShell(<DocumentDetail data={doc("02.01")} decide={vi.fn()} />);
    const v2 = screen.getByRole("button", { name: /^v2\s*16\/10$/ });
    const v1 = screen.getByRole("button", { name: /^v1\s*09\/10$/ });
    expect(v2).toHaveClass("bd-v", "is-cur");
    expect(v2).not.toHaveClass("is-on");
    expect(v2).toHaveStyle({ width: "100%" });
    expect(v1).not.toHaveClass("is-cur");
    await userEvent.click(v1);
    expect(v1).toHaveClass("is-cur");
    expect(v2).not.toHaveClass("is-cur");
  });
});
