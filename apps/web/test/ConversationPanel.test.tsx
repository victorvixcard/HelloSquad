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
    createWork: vi.fn(async () => ({ ok: true as const, data: { workItemId: "wi-9", runId: "run-9", conversationId: "otto-1" } })),
    decide: vi.fn(async () => ({ ok: true as const, data: {} as never })),
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

  it("mensagem enviada enquanto a conversa carrega não some quando a leitura chega", async () => {
    // A leitura (before=latest) saiu antes do envio e volta sem a mensagem nova: a tela mantém o que a pessoa enviou.
    let finish: (() => void) | null = null;
    const acts = actions({
      load: vi.fn(
        () =>
          new Promise((resolve) => {
            finish = () =>
              resolve({
                ok: true as const,
                data: { detail: {} as never, messages: [message("m1", "Mensagem antiga", "2026-10-15T10:12:00-03:00")], older: null },
              });
          }),
      ) as ConversationActions["load"],
    });
    const user = userEvent.setup();
    renderWithShell(<ConversationPanel actions={acts} now={NOW} />, openShell());
    await user.type(screen.getByRole("textbox", { name: "Mensagem para o Otto…" }), "Uma legenda para o Instagram{Enter}");
    await waitFor(() => expect(acts.send).toHaveBeenCalled());
    await act(async () => finish?.());
    expect(await screen.findByText("Mensagem antiga")).toBeInTheDocument();
    expect(screen.getByText("Uma legenda para o Instagram")).toBeInTheDocument();
  });

  it("mensagem do agente com entrega mostra o cartão Material · v1; aprovar e pedir ajuste seguem o protótipo", async () => {
    const delivered = {
      ...message("m3", "Pronto, a primeira versão da legenda.", "2026-10-16T10:58:00-03:00", "agent"),
      run_id: "run-9",
      attachments: [{ type: "delivery_version", delivery_id: "d-9", delivery_version_id: "v-9", version_no: "1" }],
    };
    const card = vi.fn(async () => ({
      ok: true as const,
      data: {
        workItemId: "wi-9",
        title: "Legenda do sábado",
        agentId: "otto",
        versionNo: 1,
        state: "review" as const,
        approvalId: "ap-9",
        excerpt: "Sábado é dia de pão quentinho.",
      },
    }));
    const decide = vi.fn(async () => ({ ok: true as const, data: {} as never }));
    const acts = actions({
      load: vi.fn(async () => ({ ok: true as const, data: { detail: {} as never, messages: [delivered], older: null } })),
      card: { card, decide },
    });
    const user = userEvent.setup();
    const { shell } = renderWithShell(<ConversationPanel actions={acts} now={NOW} />, openShell());
    expect(await screen.findByText("Material · v1")).toBeInTheDocument();
    expect(card).toHaveBeenCalledWith("run-9", "v-9");
    expect(screen.getByText("Legenda do sábado")).toBeInTheDocument();
    expect(screen.getByText("Aguarda sua aprovação")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir a v1: Legenda do sábado" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Pedir ajuste" }));
    expect(shell.openConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "otto-1",
        draft: "Quero pedir um ajuste nesta versão.",
        adjust: { approvalId: "ap-9", workItemId: "wi-9", version: 1 },
      }),
    );
    expect(decide).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Aprovar v1" }));
    expect(decide).toHaveBeenCalledWith("ap-9", "approved");
    expect(await screen.findByText("Aprovada por você")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aprovar v1" })).toBeNull();
  });

  it("quem não é owner vê o cartão da entrega sem os botões de decisão", async () => {
    const delivered = {
      ...message("m3", "Pronto.", "2026-10-16T10:58:00-03:00", "agent"),
      run_id: "run-9",
      attachments: [{ type: "delivery_version", delivery_id: "d-9", delivery_version_id: "v-9", version_no: "1" }],
    };
    const card = vi.fn(async () => ({
      ok: true as const,
      data: { workItemId: "wi-9", title: "Legenda", agentId: "otto", versionNo: 1, state: "review" as const, approvalId: "ap-9", excerpt: "" },
    }));
    const acts = actions({
      load: vi.fn(async () => ({ ok: true as const, data: { detail: {} as never, messages: [delivered], older: null } })),
      card: { card, decide: vi.fn() },
    });
    renderWithShell(<ConversationPanel actions={acts} now={NOW} />, { ...openShell(), canDecide: false });
    expect(await screen.findByText("Aguarda sua aprovação")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aprovar v1" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Pedir ajuste" })).toBeNull();
  });

  it("tela cheia a partir de 940 px mostra o Contexto da conversa (V4.6 _vRail): fatos, quem responde e Voltar para", async () => {
    const user = userEvent.setup();
    const target = {
      conversationId: "otto-1",
      agent: "otto" as const,
      context: {
        kind: "work_item" as const,
        label: "Legenda do sábado",
        origin: "pedido na conversa com o Otto · 16/10",
      },
    };
    const full = makeShell({
      layout: productLayout({ vw: 1440, vh: 900, sideMin: null, mode: "full", pilot: false, pop: false }),
      conversation: { mode: "full", target },
    });
    renderWithShell(<ConversationPanel actions={actions()} now={NOW} />, full);
    const rail = screen.getByRole("complementary", { name: "Contexto da conversa" });
    expect(within(rail).getByText("Legenda do sábado")).toBeInTheDocument();
    const facts = [...rail.querySelectorAll("dt")].map((dt) => `${dt.textContent}: ${dt.nextElementSibling?.textContent}`);
    expect(facts).toEqual(["Ambiente: Conteúdo", "Negócio: Miolo", "Origem: pedido na conversa com o Otto · 16/10"]);
    expect(within(rail).getByText("responde · Conteúdo")).toBeInTheDocument();
    expect(within(rail).getByRole("button", { name: "Voltar para Conteúdo" })).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Mostrar o contexto" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    await user.click(toggle);
    expect(screen.queryByRole("complementary", { name: "Contexto da conversa" })).toBeNull();
  });

  it("ambiente: Tipo Ambiente e a linha de apoio; no painel ao lado não há coluna de contexto", () => {
    const target = {
      conversationId: "otto-1",
      agent: "otto" as const,
      context: { kind: "env" as const, label: "Conteúdo", href: "/app/miolo/squad/otto", meta: "Otto cuida do conteúdo." },
    };
    const full = makeShell({
      layout: productLayout({ vw: 1440, vh: 900, sideMin: null, mode: "full", pilot: false, pop: false }),
      conversation: { mode: "full", target },
    });
    const { unmount } = renderWithShell(<ConversationPanel actions={actions()} now={NOW} />, full);
    const rail = screen.getByRole("complementary", { name: "Contexto da conversa" });
    expect(within(rail).getByText("Otto cuida do conteúdo.")).toBeInTheDocument();
    expect([...rail.querySelectorAll("dt")].map((dt) => dt.textContent)).toEqual(["Ambiente", "Tipo", "Negócio"]);
    unmount();
    renderWithShell(<ConversationPanel actions={actions()} now={NOW} />, openShell());
    expect(screen.queryByRole("complementary", { name: "Contexto da conversa" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Mostrar o contexto" })).toBeNull();
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
