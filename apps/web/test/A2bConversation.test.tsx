import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CapCatalog } from "@/components/env/CapCatalog";
import { EnvIdentity } from "@/components/env/EnvIdentity";
import { ConversationPanel, type ConversationActions } from "@/components/product/ConversationPanel";
import type { ConversationTarget } from "@/components/product/shell-context";
import { productLayout } from "@/lib/product-layout";
import { makeShell, renderWithShell } from "./render";

const NOW = new Date("2026-10-16T11:00:00-03:00");

function actions(over: Partial<ConversationActions> = {}): ConversationActions {
  return {
    load: vi.fn(async () => ({
      ok: true as const,
      data: {
        detail: {
          opening: {
            agent_id: "bia" as const,
            message: "Oi, eu sou a Bia. Disponível. O que você precisa?",
            suggestions: ["Onde a Miolo pode crescer até o Natal?", "Analisar os concorrentes do bairro"],
          },
          context: { type: "environment", id: null, key: "bia", title: "Estratégia", status: null },
        } as never,
        messages: [],
        older: null,
      },
    })),
    older: vi.fn(async () => ({ ok: true as const, data: { messages: [], older: null } })),
    send: vi.fn(async (_id: string, body: string) => ({
      ok: true as const,
      data: {
        id: "m2",
        conversation_id: "cap-1",
        author_type: "user" as const,
        author_user_id: "u1",
        author_agent_id: null,
        run_id: null,
        body,
        body_format: "markdown",
        attachments: [],
        created_at: "2026-10-16T10:59:00-03:00",
      },
    })),
    create: vi.fn(async () => ({ ok: true as const, data: { id: "direta" } })),
    createWork: vi.fn(async () => ({ ok: true as const, data: { workItemId: "wi-9", runId: "run-9", conversationId: "cap-1" } })),
    decide: vi.fn(async () => ({ ok: true as const, data: {} as never })),
    openObject: vi.fn(async () => ({ ok: true as const, data: { id: "env-bia" } })),
    ...over,
  };
}

function panelShell(target: ConversationTarget) {
  return makeShell({
    layout: productLayout({ vw: 1440, vh: 900, sideMin: null, mode: "panel", pilot: false, pop: false }),
    conversation: { mode: "panel", target },
  });
}

describe("H1-04: Conversar com <Nome> abre a conversa do ambiente", () => {
  it("o botão da identidade pede a conversa do ambiente (environment), separada da direta", async () => {
    const user = userEvent.setup();
    const { shell } = renderWithShell(
      <EnvIdentity agent="bia" business="Miolo" />,
      makeShell({ conversationIds: { room: null, direct: { bia: "bia-direta" } } }),
    );
    await user.click(screen.getByRole("button", { name: "Conversar com Bia sobre Estratégia, ao lado" }));
    expect(shell.openConversation).toHaveBeenCalledWith({
      conversationId: null,
      agent: "bia",
      context: {
        kind: "env",
        label: "Estratégia",
        href: "/app/miolo/squad/bia",
        meta: "Bia encontra onde está a oportunidade de Miolo.",
        ref: { type: "environment", key: "bia", title: "Estratégia" },
      },
    });
  });

  it("o painel cria (ou reabre) a conversa do ambiente na API e segue nela", async () => {
    const acts = actions();
    const target: ConversationTarget = {
      conversationId: null,
      agent: "bia",
      context: { kind: "env", label: "Estratégia", href: "/app/miolo/squad/bia", ref: { type: "environment", key: "bia", title: "Estratégia" } },
    };
    const shell = panelShell(target);
    renderWithShell(<ConversationPanel actions={acts} now={NOW} />, shell);
    await waitFor(() => expect(acts.openObject).toHaveBeenCalledWith("ws-1", { type: "environment", key: "bia", title: "Estratégia" }, "bia"));
    expect(shell.openConversation).toHaveBeenCalledWith({ ...target, conversationId: "env-bia" }, "panel");
    // Sem id ainda, nada é lido nem enviado.
    expect(acts.load).not.toHaveBeenCalled();
  });

  it("mostra a primeira fala do agente e as sugestões do ambiente, e o tipo Ambiente no contexto", async () => {
    const acts = actions();
    const { container } = renderWithShell(
      <ConversationPanel actions={acts} now={NOW} />,
      makeShell({
        layout: productLayout({ vw: 1440, vh: 900, sideMin: null, mode: "full", pilot: false, pop: false }),
        conversation: {
          mode: "full",
          target: {
            conversationId: "env-bia",
            agent: "bia",
            context: { kind: "env", label: "Estratégia", href: "/app/miolo/squad/bia", ref: { type: "environment", key: "bia", title: "Estratégia" } },
          },
        },
      }),
    );
    expect(await screen.findByText("Oi, eu sou a Bia. Disponível. O que você precisa?")).toBeInTheDocument();
    expect(screen.getByText("Hoje")).toBeInTheDocument();
    const sug = screen.getByRole("group", { name: "Pergunte à Bia" });
    expect(within(sug).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Onde a Miolo pode crescer até o Natal?",
      "Analisar os concorrentes do bairro",
    ]);
    const rail = screen.getByRole("complementary", { name: "Contexto da conversa" });
    expect(within(rail).getByText("Tipo").nextSibling).toHaveTextContent("Ambiente");
    expect(container.querySelector(".cx-sub-k")?.textContent).toBe("Conversando sobre");
  });
});

describe("Catálogo O que pedir (V4.2/V4.3)", () => {
  it("lista as capacidades da Bia por finalidade, busca sem acento e mostra o vazio da V4.6", async () => {
    const user = userEvent.setup();
    renderWithShell(<CapCatalog agent="bia" />, makeShell());
    await user.click(screen.getByRole("button", { name: "Ver o que dá para pedir à Bia" }));
    const dialog = screen.getByRole("dialog", { name: "O que você quer fazer com a Bia?" });
    expect(within(dialog).getByText("A Bia conduz o briefing na conversa, sem formulário.")).toBeInTheDocument();
    expect(within(dialog).getByText("Entender o negócio")).toBeInTheDocument();
    expect(within(dialog).getByText("Decidir o rumo")).toBeInTheDocument();
    expect(within(dialog).getAllByRole("button").map((b) => b.querySelector("b")?.textContent)).toEqual([
      "Analisar meu negócio",
      "Analisar o mercado e os concorrentes",
      "Definir o posicionamento",
      "Montar um planejamento",
      "Encontrar oportunidades",
    ]);
    const search = within(dialog).getByRole("textbox", { name: "Buscar o que pedir" });
    expect(search).toHaveAttribute("placeholder", "Buscar: diagnóstico, concorrentes…");
    await user.type(search, "diagnostico");
    expect(within(dialog).getAllByRole("button")).toHaveLength(1);
    await user.clear(search);
    await user.type(search, "xyz");
    expect(within(dialog).getByText("Nada com “xyz”. Escreva na conversa o que você precisa: a Bia entende.")).toBeInTheDocument();
    expect(within(dialog).getByText("Quando o pedido envolve outra especialidade, a Bia chama quem precisa na mesma conversa.")).toBeInTheDocument();
  });

  it("cada capacidade abre a conversa do pedido com o texto da V4.6 no campo e a entrega dela", async () => {
    const user = userEvent.setup();
    const { shell } = renderWithShell(<CapCatalog agent="bia" />, makeShell());
    await user.click(screen.getByRole("button", { name: "Ver o que dá para pedir à Bia" }));
    await user.click(screen.getByRole("button", { name: /^Analisar meu negócio\./ }));
    expect(shell.openConversation).toHaveBeenCalledWith({
      conversationId: null,
      agent: "bia",
      context: {
        kind: "capability",
        label: "Analisar meu negócio",
        origin: "Estratégia",
        ref: { type: "capability", key: "02.01", title: "Analisar meu negócio", origin: "Estratégia" },
      },
      draft: "Quero analisar meu negócio.",
      deliveryType: "02.01",
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // A2d (H2-01): "Coordenar uma campanha" é do Nexo (V4.6 `ag: 'coord'`) e vira o projeto coordenado 01.02 da S2d.
  it("Coordenar uma campanha (Nexo) vira o projeto coordenado (01.02) com o Nexo à frente; sem entrega, só o aviso", async () => {
    const user = userEvent.setup();
    const { shell } = renderWithShell(<CapCatalog agent="nexo" />, makeShell());
    await user.click(screen.getByRole("button", { name: "Ver o que dá para pedir ao Nexo" }));
    await user.click(screen.getByRole("button", { name: /^Coordenar uma campanha\./ }));
    expect(shell.openConversation).toHaveBeenCalledWith(expect.objectContaining({ agent: "nexo", deliveryType: "01.02" }));
    await user.click(screen.getByRole("button", { name: "Ver o que dá para pedir ao Nexo" }));
    await user.click(screen.getByRole("button", { name: /^Começar um projeto novo\./ }));
    expect(shell.toast).toHaveBeenCalledWith(
      "Este pedido ainda não tem entrega nesta versão. Escreva na conversa o que você precisa.",
      "nexo",
    );
  });

  it("na Kaia, todo pedido explica que as peças esperam o motor de imagem", async () => {
    const user = userEvent.setup();
    const { shell } = renderWithShell(<CapCatalog agent="kaia" />, makeShell());
    await user.click(screen.getByRole("button", { name: "Ver o que dá para pedir à Kaia" }));
    await user.click(screen.getByRole("button", { name: /^Criar um carrossel\./ }));
    expect(shell.openConversation).not.toHaveBeenCalled();
    expect(shell.toast).toHaveBeenCalledWith("As peças da Kaia esperam o motor de imagem. Nada é criado antes de ele chegar.", "kaia");
  });

  it("na conversa do pedido, a primeira mensagem cria a conversa do pedido e o trabalho da entrega", async () => {
    const user = userEvent.setup();
    const acts = actions({ openObject: vi.fn(async () => ({ ok: true as const, data: { id: "cap-1" } })) });
    const target: ConversationTarget = {
      conversationId: null,
      agent: "bia",
      context: { kind: "capability", label: "Analisar meu negócio", ref: { type: "capability", key: "02.01", title: "Analisar meu negócio" } },
      draft: "Quero analisar meu negócio.",
      deliveryType: "02.01",
    };
    renderWithShell(<ConversationPanel actions={acts} now={NOW} />, panelShell(target));
    const field = screen.getByRole("textbox", { name: "Mensagem para a Bia…" });
    await waitFor(() => expect(field).toHaveValue("Quero analisar meu negócio."));
    // O pedido do catálogo só nasce com a mensagem (uma conversa por pedido).
    expect(acts.openObject).not.toHaveBeenCalled();
    await user.type(field, "{Enter}");
    await waitFor(() => expect(acts.createWork).toHaveBeenCalledWith("m2", "02.01", "Quero analisar meu negócio"));
    expect(acts.openObject).toHaveBeenCalledWith("ws-1", { type: "capability", key: "02.01", title: "Analisar meu negócio" }, "bia");
    expect(acts.send).toHaveBeenCalledWith("cap-1", "Quero analisar meu negócio.");
    expect(acts.create).not.toHaveBeenCalled();
  });
});
