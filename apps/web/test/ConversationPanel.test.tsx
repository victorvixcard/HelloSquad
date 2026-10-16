import { act, screen, waitFor, within } from "@testing-library/react";
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

function actions(over: Partial<ConversationActions> = {}): ConversationActions {
  return {
    load: vi.fn(async () => ({
      ok: true as const,
      data: {
        detail: {} as never,
        messages: [message("m1", "Otto, preciso de uma legenda para o post de sábado.", "2026-10-15T10:12:00-03:00")],
        older: null,
      },
    })),
    older: vi.fn(async () => ({ ok: true as const, data: { messages: [], older: null } })),
    send: vi.fn(async (_id: string, body: string) => ({ ok: true as const, data: message("m2", body, "2026-10-16T10:59:00-03:00") })),
    create: vi.fn(async () => ({ ok: true as const, data: { id: "nova" } })),
    ...over,
  };
}

function directShell(target: { conversationId: string | null; agent: "otto"; fresh?: boolean }) {
  return makeShell({
    layout: productLayout({ vw: 1440, vh: 900, sideMin: null, mode: "panel", pilot: false, pop: false }),
    conversation: { mode: "panel", target },
  });
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
    // Conversa sobre um objeto não tem o seletor de conversas (V4.6: showThr só na conversa direta).
    expect(container.querySelector(".ps-thb")).toBeNull();
  });

  it("abre pelas mensagens mais recentes e traz as anteriores pelo cursor (before)", async () => {
    const acts = actions({
      load: vi.fn(async () => ({
        ok: true as const,
        data: { detail: {} as never, messages: [message("m5", "A mais recente", "2026-10-16T10:40:00-03:00")], older: "cur-1" },
      })),
      older: vi.fn(async () => ({
        ok: true as const,
        data: { messages: [message("m4", "A anterior", "2026-10-16T10:30:00-03:00")], older: null },
      })),
    });
    const { container } = renderWithShell(<ConversationPanel actions={acts} now={NOW} />, openShell());
    await waitFor(() => expect(acts.older).toHaveBeenCalledWith("otto-1", "cur-1"));
    expect(await screen.findByText("A anterior")).toBeInTheDocument();
    expect([...container.querySelectorAll(".ps-bub")].map((el) => el.textContent)).toEqual(["A anterior", "A mais recente"]);
    expect(acts.older).toHaveBeenCalledOnce();
  });

  it("conversa direta: o seletor lista as conversas com o especialista e Nova conversa abre um diálogo novo", async () => {
    const user = userEvent.setup();
    const shell = directShell({ conversationId: "otto-1", agent: "otto" });
    renderWithShell(<ConversationPanel actions={actions()} now={NOW} />, shell);
    const thb = screen.getByRole("button", { name: "Conversa com o Otto" });
    expect(thb).toHaveAttribute("aria-expanded", "false");
    await user.click(thb);
    const menu = screen.getByRole("menu", { name: "Conversas Nova conversa com o Otto" });
    expect(within(menu).getAllByRole("menuitem").map((el) => el.textContent)).toEqual([
      "Conversa com o Otto09:10",
      "Ideias para o Dia do Pão23/09",
      "Nova conversa",
    ]);
    expect(within(menu).getAllByRole("menuitem")[0]).toHaveClass("is-on");
    await user.click(within(menu).getAllByRole("menuitem")[1]);
    expect(shell.openConversation).toHaveBeenLastCalledWith({ conversationId: "otto-0", agent: "otto", fresh: false }, "panel");
    await user.click(thb);
    await user.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: "Nova conversa" }));
    expect(shell.openConversation).toHaveBeenLastCalledWith({ conversationId: null, agent: "otto", fresh: true }, "panel");
    // Esc fecha só o seletor e devolve o foco ao botão; a conversa continua aberta.
    await user.click(thb);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(thb).toHaveFocus();
    expect(shell.closeConversation).not.toHaveBeenCalled();
  });

  it("Nova conversa: a primeira mensagem cria uma conversa nova (nunca reaproveita) com o título do protótipo", async () => {
    const user = userEvent.setup();
    const acts = actions();
    const shell = directShell({ conversationId: null, agent: "otto", fresh: true });
    renderWithShell(<ConversationPanel actions={acts} now={NOW} />, shell);
    expect(screen.getByRole("button", { name: "Nova conversa" })).toBeInTheDocument();
    expect(acts.load).not.toHaveBeenCalled();
    await user.type(screen.getByRole("textbox", { name: "Mensagem para o Otto…" }), "Quero ideias de posts para a semana do Natal{Enter}");
    await waitFor(() => expect(acts.create).toHaveBeenCalledWith("ws-1", "otto", "Quero ideias de posts para a sem…"));
    await waitFor(() => expect(acts.send).toHaveBeenCalledWith("nova", "Quero ideias de posts para a semana do Natal"));
    expect(shell.rememberThread).toHaveBeenCalledWith("otto", expect.objectContaining({ id: "nova", title: "Quero ideias de posts para a sem…" }));
    expect(shell.openConversation).toHaveBeenCalledWith({ conversationId: "nova", agent: "otto", context: undefined }, "panel");
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
