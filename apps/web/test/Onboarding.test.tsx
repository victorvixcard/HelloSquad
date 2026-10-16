import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HomeView } from "@/components/home/HomeView";
import { ConversationPanel, type ConversationActions } from "@/components/product/ConversationPanel";
import type { BrandFact, FactSource } from "@/lib/memory";
import { onboardingFrom, type Onboarding } from "@/lib/onboarding";
import { productLayout } from "@/lib/product-layout";
import { makeShell, renderWithShell } from "./render";

vi.mock("@/components/home/SquadStage", () => ({ SquadStage: () => <div className="hm-stage" /> }));

function fact(over: Partial<BrandFact>): BrandFact {
  return {
    id: "f1",
    workspace_id: "ws-1",
    area: "business",
    topic: "História",
    key: "Negócio",
    content: "Padaria",
    state: "confirmed",
    source_type: "onboarding",
    ...over,
  } as BrandFact;
}

function source(over: Partial<FactSource>): FactSource {
  return { id: "s1", kind: "connection", name: "Instagram", state: "not_connected", permissions: [], fact_count: 0, ...over } as FactSource;
}

const dossier = (facts: BrandFact[], sources: FactSource[] = []) => ({
  sources,
  areas: [{ area: "business" as const, topics: [{ topic: "x", facts }] }],
});

describe("onboardingFrom: progresso real do primeiro acesso (V4.6 _vOnb)", () => {
  it("Memória vazia: cartão à vista, 0 de 3", () => {
    expect(onboardingFrom(dossier([]))).toEqual({ show: true, done: 0, total: 3, site: false, instagram: false, objective: null });
  });

  it("só o objetivo contado ao Nexo: o cartão continua, 1 de 3, com o objetivo", () => {
    const onb = onboardingFrom(dossier([fact({ topic: "Objetivos", key: "Objetivo atual", content: "Vender mais encomendas" })]));
    expect(onb).toMatchObject({ show: true, done: 1, objective: "Vender mais encomendas" });
  });

  it("conta já configurada (a Memória sabe mais que o objetivo, como a Miolo do seed): sem cartão", () => {
    expect(onboardingFrom(dossier([fact({}), fact({ area: "audience", topic: "Perfil dos clientes" })])).show).toBe(false);
  });

  it("sugestão, conflito, descartado e fora de uso não contam como conhecido", () => {
    const pending = ["suggested", "conflicting", "discarded", "unused", "outdated"] as const;
    expect(onboardingFrom(dossier(pending.map((state) => fact({ state })))).show).toBe(true);
    expect(onboardingFrom(dossier([fact({ topic: "Objetivos", state: "suggested" })])).objective).toBeNull();
  });

  it("site e Instagram só contam com a fonte conectada; não conectada não avança", () => {
    expect(onboardingFrom(dossier([], [source({})])).instagram).toBe(false);
    const both = onboardingFrom(dossier([], [source({ state: "connected" }), source({ id: "s2", name: "Site", state: "connected" })]));
    expect(both).toMatchObject({ site: true, instagram: true, done: 2 });
  });
});

const FIRST: Onboarding = { show: true, done: 0, total: 3, site: false, instagram: false, objective: null };

function homeActions() {
  return {
    send: vi.fn(async (_id: string, body: string) => ({ ok: true as const, data: { id: "m1", body } as never })),
    create: vi.fn(async () => ({ ok: true as const, data: { id: "nova" } })),
    createWork: vi.fn(async () => ({ ok: true as const, data: { workItemId: "wi-1", runId: "run-1", conversationId: "otto-1" } })),
    decide: vi.fn(async () => ({ ok: true as const, data: {} as never })),
  };
}

describe("Início no primeiro acesso: Para o squad conhecer… (V4.6 L4642)", () => {
  it("mostra os três passos com 0 de 3; site e Instagram dão o aviso padrão, sem simular", async () => {
    const user = userEvent.setup();
    const shell = makeShell({ workspace: { id: "ws-2", slug: "trilha", name: "Trilha Urbana" }, conversationIds: { room: null, direct: {} } });
    const { container } = renderWithShell(
      <HomeView firstName="Juliana" business="Trilha Urbana" needs={[]} inProgress={[]} onboarding={FIRST} actions={homeActions()} />,
      shell,
    );
    const card = screen.getByRole("article", { name: "Para o squad conhecer Trilha Urbana" });
    expect(within(card).getByText("0 de 3")).toBeInTheDocument();
    expect(container.querySelector(".hm-ring")).toHaveStyle("--p: 0%");
    expect(container.querySelector(".hm-res")).toBeNull();
    await user.click(within(card).getByRole("button", { name: "Ler o site" }));
    await user.click(within(card).getByRole("button", { name: "Conectar" }));
    expect(shell.toast).toHaveBeenNthCalledWith(1, "Ainda não disponível nesta versão.");
    expect(shell.toast).toHaveBeenNthCalledWith(2, "Ainda não disponível nesta versão.", "iris");
  });

  it("Conversar abre o Nexo em tela cheia com as escolhas de objetivo (V4.6 `talk: _openConv('coord', full)`)", async () => {
    const user = userEvent.setup();
    const shell = makeShell({ conversationIds: { room: null, direct: {} } });
    renderWithShell(<HomeView firstName="Pedro" business="Oficina" needs={[]} inProgress={[]} onboarding={FIRST} actions={homeActions()} />, shell);
    await user.click(screen.getByRole("button", { name: "Conversar" }));
    expect(shell.openConversation).toHaveBeenCalledWith({ conversationId: null, agent: "nexo", objective: true }, "full");
  });

  it("objetivo guardado: 1 de 3, o passo marcado com o objetivo e sem o botão", () => {
    const { container } = renderWithShell(
      <HomeView firstName="Pedro" business="Oficina" needs={[]} inProgress={[]} onboarding={{ ...FIRST, done: 1, objective: "Fortalecer a marca" }} actions={homeActions()} />,
    );
    expect(screen.getByText("1 de 3")).toBeInTheDocument();
    expect(container.querySelector(".hm-ring")).toHaveStyle("--p: 33%");
    expect(screen.getByText("Objetivo: Fortalecer a marca")).toBeInTheDocument();
    expect(container.querySelectorAll(".hm-ob.is-done")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Conversar" })).toBeNull();
  });

  it("conta já configurada: sem onboarding; Resultados com o vazio honesto da Íris", async () => {
    const user = userEvent.setup();
    const shell = makeShell({ conversationIds: { room: null, direct: { iris: "iris-1" } } });
    const { container } = renderWithShell(
      <HomeView firstName="Marina" business="Miolo" needs={[]} inProgress={[]} onboarding={{ ...FIRST, show: false }} actions={homeActions()} />,
      shell,
    );
    expect(container.querySelector("#h-onb")).toBeNull();
    const res = screen.getByRole("article", { name: "Resultados" });
    expect(res).toHaveTextContent("A Íris ainda não tem números para ler");
    expect(within(res).getByRole("link", { name: "Abrir Resultados" })).toHaveAttribute("href", "/app/miolo/squad/iris");
    await user.click(within(res).getByRole("button", { name: "Conversar com a Íris" }));
    expect(shell.openConversation).toHaveBeenCalledWith({ conversationId: "iris-1", agent: "iris" });
  });
});

function panelActions(over: Partial<ConversationActions> = {}): ConversationActions {
  return {
    load: vi.fn(async () => ({ ok: true as const, data: { detail: {} as never, messages: [], older: null } })),
    older: vi.fn(async () => ({ ok: true as const, data: { messages: [], older: null } })),
    send: vi.fn(async (_id: string, body: string) => ({
      ok: true as const,
      data: { id: "m9", conversation_id: "nova", author_type: "user", body, attachments: [], created_at: "2026-10-16T15:00:00-03:00" } as never,
    })),
    create: vi.fn(async () => ({ ok: true as const, data: { id: "nova" } })),
    createWork: vi.fn(async () => ({ ok: true as const, data: { workItemId: "wi-9", runId: null, conversationId: null } })),
    decide: vi.fn(async () => ({ ok: true as const, data: {} as never })),
    addObjective: vi.fn(async () => ({ ok: true as const, data: {} as never })),
    ...over,
  };
}

function nexoShell() {
  return makeShell({
    workspace: { id: "ws-9", slug: "oficina", name: "Oficina" },
    layout: productLayout({ vw: 1440, vh: 900, sideMin: null, mode: "full", pilot: false, pop: false }),
    conversation: { mode: "full", target: { conversationId: null, agent: "nexo", objective: true } },
    conversationIds: { room: null, direct: {} },
  });
}

describe("Conte o resto ao Nexo: objetivo para a Memória da Marca (V4.6 L6280, L7040)", () => {
  it("mostra a pergunta e as três escolhas da V4.6 no lugar das sugestões", async () => {
    renderWithShell(<ConversationPanel actions={panelActions()} />, nexoShell());
    const group = await screen.findByRole("group", { name: "Para começar: qual é o objetivo mais importante de Oficina agora?" });
    expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Vender mais encomendas",
      "Trazer gente nova para a loja",
      "Fortalecer a marca",
    ]);
  });

  it("escolher envia a mensagem da pessoa ao Nexo e guarda o objetivo, confirmado", async () => {
    const user = userEvent.setup();
    const acts = panelActions();
    const shell = nexoShell();
    renderWithShell(<ConversationPanel actions={acts} />, shell);
    await user.click(await screen.findByRole("button", { name: "Vender mais encomendas" }));
    await waitFor(() => expect(acts.addObjective).toHaveBeenCalledWith("ws-9", "Vender mais encomendas"));
    expect(acts.create).toHaveBeenCalledWith("ws-9", "nexo", "Vender mais encomendas.");
    expect(acts.send).toHaveBeenCalledWith("nova", "Vender mais encomendas.");
    expect(shell.toast).toHaveBeenCalledWith("Anotado na Memória da Marca: “Vender mais encomendas”.");
    // A conversa passou a existir e segue sem o modo de objetivo.
    expect(shell.openConversation).toHaveBeenCalledWith({ conversationId: "nova", agent: "nexo", context: undefined }, "full");
  });

  it("se a mensagem não sair, o objetivo não é guardado", async () => {
    const user = userEvent.setup();
    const acts = panelActions({ send: vi.fn(async () => ({ ok: false as const, code: "x", message: "falhou" })) });
    renderWithShell(<ConversationPanel actions={acts} />, nexoShell());
    await user.click(await screen.findByRole("button", { name: "Fortalecer a marca" }));
    await waitFor(() => expect(acts.send).toHaveBeenCalled());
    expect(acts.addObjective).not.toHaveBeenCalled();
  });

  it("se a Memória recusar (quem não é o dono), diz o motivo da API", async () => {
    const user = userEvent.setup();
    const acts = panelActions({
      addObjective: vi.fn(async () => ({ ok: false as const, code: "forbidden", message: "Só o dono da conta toma esta decisão." })),
    });
    const shell = nexoShell();
    renderWithShell(<ConversationPanel actions={acts} />, shell);
    await user.click(await screen.findByRole("button", { name: "Trazer gente nova para a loja" }));
    await waitFor(() => expect(shell.toast).toHaveBeenCalledWith("Só o dono da conta toma esta decisão."));
  });
});
