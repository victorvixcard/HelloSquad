import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConversationPanel, type ConversationActions } from "@/components/product/ConversationPanel";
import { productLayout } from "@/lib/product-layout";
import { makeShell, renderWithShell } from "./render";

const NOW = new Date("2026-10-16T11:00:00-03:00");

function message(id: string, body: string, at: string, author: "user" | "agent" = "user") {
  return {
    id,
    conversation_id: "otto-1",
    author_type: author,
    author_user_id: author === "user" ? "u1" : null,
    author_agent_id: author === "agent" ? ("otto" as const) : null,
    run_id: null,
    body,
    body_format: "text",
    attachments: [],
    created_at: at,
  };
}

function actions(): ConversationActions {
  return {
    load: vi.fn(async () => ({
      ok: true as const,
      data: {
        detail: {} as never,
        messages: [message("m1", "Otto, preciso de uma legenda para o post de sábado.", "2026-10-15T10:12:00-03:00")],
      },
    })),
    send: vi.fn(async (_id: string, body: string) => ({ ok: true as const, data: message("m2", body, "2026-10-16T10:59:00-03:00") })),
    create: vi.fn(async () => ({ ok: true as const, data: { id: "nova" } })),
  };
}

function openShell() {
  const target = { conversationId: "otto-1", agent: "otto" as const, context: { kind: "env" as const, label: "Conteúdo", href: "/app/miolo/squad/otto" } };
  return makeShell({
    layout: productLayout({ vw: 1440, vh: 900, sideMin: null, mode: "panel", pilot: true, pop: false }),
    conversation: { mode: "panel", target },
  });
}

describe("painel de conversa universal", () => {
  it("abre com 380 px, o objeto no cabeçalho e o histórico da API (só leitura)", async () => {
    const acts = actions();
    const { container } = renderWithShell(<ConversationPanel actions={acts} now={NOW} />, openShell());
    const panel = screen.getByRole("region", { name: "Conversa" });
    expect(panel).toHaveStyle({ width: "380px" });
    expect(container.querySelector(".cx-sub-k")?.textContent).toBe("Conversando sobre");
    expect(screen.getByRole("link", { name: /Conteúdo/ })).toHaveAttribute("href", "/app/miolo/squad/otto");
    expect(await screen.findByText("Otto, preciso de uma legenda para o post de sábado.")).toBeInTheDocument();
    expect(acts.load).toHaveBeenCalledWith("otto-1");
    expect(screen.getByText("Ontem")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Pergunte ao Otto" })).toBeInTheDocument();
  });

  it("envia pelo POST /conversations/{id}/messages e mostra a mensagem enviada", async () => {
    const user = userEvent.setup();
    const acts = actions();
    renderWithShell(<ConversationPanel actions={acts} now={NOW} />, openShell());
    await screen.findByText("Otto, preciso de uma legenda para o post de sábado.");
    const field = screen.getByRole("textbox", { name: "Mensagem para o Otto…" });
    await user.type(field, "Pode deixar mais curta?{Enter}");
    await waitFor(() => expect(acts.send).toHaveBeenCalledWith("otto-1", "Pode deixar mais curta?"));
    expect(await screen.findByText("Pode deixar mais curta?")).toBeInTheDocument();
  });

  it("Esc fecha e devolve o foco a quem abriu", async () => {
    const opener = document.createElement("button");
    opener.textContent = "Conversar com Otto";
    document.body.appendChild(opener);
    opener.focus();
    const shell = openShell();
    renderWithShell(<ConversationPanel actions={actions()} now={NOW} />, shell);
    await screen.findByText("Otto, preciso de uma legenda para o post de sábado.");
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    });
    expect(shell.closeConversation).toHaveBeenCalledOnce();
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it("expandir leva à conversa dedicada", async () => {
    const user = userEvent.setup();
    const shell = openShell();
    renderWithShell(<ConversationPanel actions={actions()} now={NOW} />, shell);
    await user.click(screen.getByRole("button", { name: "Expandir a conversa" }));
    expect(shell.openConversation).toHaveBeenCalledWith(shell.conversation.target, "full");
  });

  it("fechado, não ocupa largura nem aparece para leitor de tela", () => {
    const { container } = renderWithShell(<ConversationPanel actions={actions()} now={NOW} />);
    const section = container.querySelector("section.ps-conv");
    expect(section).toHaveAttribute("aria-hidden", "true");
    expect(section).toHaveStyle({ width: "0px" });
  });
});
