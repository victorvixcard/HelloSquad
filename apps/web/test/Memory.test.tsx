import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  groupItems,
  memoryItems,
  memoryLog,
  pendingCards,
  tabCount,
  type Filters,
} from "@/components/memory/memory-model";
import { MemoryView } from "@/components/memory/MemoryView";
import { initialLiveState, liveReducer } from "@/lib/live/live-state";
import { MEMORY_EVENTS } from "@/lib/live/realtime";
import type { BrandFact, MemoryData, MemorySuggestion } from "@/lib/memory";
import { makeShell, renderWithShell } from "./render";

const actions = vi.hoisted(() => ({
  decideSuggestionAction: vi.fn(),
  correctFactAction: vi.fn(),
  resolveConflictAction: vi.fn(),
  factHistoryAction: vi.fn(),
}));
vi.mock("@/app/app/[workspace]/memory-actions", () => actions);
vi.mock("@/lib/supabase/client", () => ({ getSupabaseBrowserClient: vi.fn(), realtimeToken: { get: vi.fn(), clear: vi.fn() } }));

const ONB = "src-onb";
const IG = "src-ig";

function fact(p: Partial<BrandFact> & Pick<BrandFact, "id" | "area" | "topic" | "key" | "content">): BrandFact {
  return {
    workspace_id: "ws-1",
    content_json: null,
    state: "confirmed",
    source_type: "onboarding",
    source_id: ONB,
    origin: "Contado por você no cadastro",
    used_by_agents: [],
    perceived_by_agent_id: null,
    confidence: null,
    valid_from: "2026-10-01T13:00:00Z",
    valid_until: null,
    version: 1,
    supersedes_id: null,
    superseded_at: null,
    confirmed_by: "marina",
    confirmed_at: "2026-10-01T13:00:00Z",
    created_at: "2026-10-01T13:00:00Z",
    updated_at: "2026-10-01T13:00:00Z",
    ...p,
  };
}

const SUGGESTION: MemorySuggestion = {
  id: "sug-1",
  workspace_id: "ws-1",
  agent_id: "otto",
  title: "Posts com bastidores do forno têm mais salvamentos",
  explanation: null,
  question: null,
  origin: null,
  area: "knowledge",
  topic: "Descobertas",
  key: "Bastidores",
  content: "Posts com bastidores do forno têm mais salvamentos",
  used_by_agents: ["otto", "kaia"],
  source_id: null,
  run_id: null,
  state: "open",
  decision: null,
  decided_by: null,
  decided_at: null,
  resulting_fact_id: null,
  created_at: "2026-10-15T14:00:00Z",
  updated_at: "2026-10-15T14:00:00Z",
};

/** A Miolo do seed (S1d): 5 do cadastro, a "Decisão sua" do 'artesanal', a sugestão do Otto e duas fontes. */
function miolo(over: Partial<MemoryData> = {}): MemoryData {
  const facts = [
    fact({ id: "f-neg", area: "business", topic: "História", key: "Negócio", content: "Padaria de fermentação natural, aberta em 2019" }),
    fact({ id: "f-prod", area: "business", topic: "Produtos", key: "Produto âncora", content: "Pão de fermentação longa" }),
    fact({ id: "f-tom", area: "brand", topic: "Tom de voz", key: "Tom de voz", content: "Acolhedor, direto, sem gíria" }),
    fact({
      id: "f-art",
      area: "brand",
      topic: "Tom de voz",
      key: "Palavra proibida",
      content: "Não usar a palavra 'artesanal' nas legendas",
      state: "decision",
      source_type: "conversation",
      source_id: null,
      origin: "Dito por você numa conversa",
      confirmed_at: "2026-10-15T13:13:00Z",
      valid_from: "2026-10-15T13:13:00Z",
    }),
    fact({ id: "f-pub", area: "audience", topic: "Perfil dos clientes", key: "Público principal", content: "Moradores de Pinheiros e Vila Madalena, 28 a 45 anos" }),
    fact({ id: "f-can", area: "audience", topic: "Comportamentos conhecidos", key: "Canais", content: "Instagram e WhatsApp" }),
  ];
  const byArea = (a: BrandFact["area"]) => {
    const list = facts.filter((f) => f.area === a);
    const topics = [...new Set(list.map((f) => f.topic))].map((topic) => ({ topic, facts: list.filter((f) => f.topic === topic) }));
    return { area: a, topics };
  };
  return {
    dossier: {
      workspace_id: "ws-1",
      brand_name: "Miolo",
      confirmed_count: 6,
      pending: { suggestions: 1, conflicts: 0, outdated: 0 },
      sources: [
        { id: ONB, kind: "onboarding", name: "Onboarding e o que você contou", state: "declared", permissions: [], last_sync_at: "2026-10-01T13:00:00Z", fact_count: 5, created_at: "2026-10-01T13:00:00Z", updated_at: "2026-10-01T13:00:00Z" },
        { id: IG, kind: "connection", name: "Instagram", state: "not_connected", permissions: ["Ler posts e métricas", "Publicar só com sua autorização"], last_sync_at: null, fact_count: 0, created_at: "2026-10-01T13:05:00Z", updated_at: "2026-10-01T13:05:00Z" },
      ],
      areas: [byArea("business"), byArea("brand"), byArea("audience")],
      suggestions: [SUGGESTION],
    },
    suggestions: [SUGGESTION],
    conflicts: [],
    ...over,
  };
}

const ALL: Filters = { area: "all", q: "", agent: null, showHidden: false };

beforeEach(() => {
  for (const fn of Object.values(actions)) fn.mockReset();
  actions.factHistoryAction.mockResolvedValue({ ok: true, data: { fact_id: "f-tom", versions: [], suggestions: [] } });
});

describe("Memória da Marca · modelo (V4.5 _vMem5)", () => {
  it("as linhas são os conhecimentos atuais e a sugestão aberta, agrupados por área e assunto na ordem da V4.5", () => {
    const items = memoryItems(miolo());
    expect(items).toHaveLength(7);
    expect(items.find((x) => x.id === "sug-1")?.state).toBe("suggested");
    const groups = groupItems(items, ALL);
    expect(groups.map((g) => g.area)).toEqual(["business", "brand", "audience", "knowledge"]);
    expect(groups[0]!.topics.map((t) => t.topic)).toEqual(["História", "Produtos"]);
    expect(tabCount(items, "all", 2)).toBe(7);
    expect(tabCount(items, "brand", 2)).toBe(2);
    expect(tabCount(items, "sources", 2)).toBe(2);
  });

  it("a busca procura em chave, valor e assunto; o filtro por especialista conta sem sugestões", () => {
    const items = memoryItems(miolo());
    const tom = groupItems(items, { ...ALL, q: "tom" });
    expect(tom.flatMap((g) => g.topics.flatMap((t) => t.rows.map((r) => r.id)))).toEqual(["f-tom", "f-art"]);
    expect(groupItems(items, { ...ALL, q: "bicicleta" })).toEqual([]);
    // Lista vazia de quem usa = todo o squad; a sugestão só vale para Otto e Kaia.
    const iris = groupItems(items, { ...ALL, agent: "iris" }).flatMap((g) => g.topics.flatMap((t) => t.rows));
    expect(iris.some((x) => x.id === "sug-1")).toBe(false);
  });

  it("descartados ficam guardados e escondidos até 'Mostrar descartados e fora de uso'", () => {
    const discarded = { ...SUGGESTION, state: "done" as const, decision: "discard" as const, decided_at: "2026-10-16T12:00:00Z" };
    const data = miolo({ suggestions: [discarded], dossier: { ...miolo().dossier, suggestions: [] } });
    const items = memoryItems(data);
    expect(items.find((x) => x.id === "sug-1")?.state).toBe("discarded");
    expect(groupItems(items, ALL).some((g) => g.area === "knowledge")).toBe(false);
    expect(groupItems(items, { ...ALL, showHidden: true }).some((g) => g.area === "knowledge")).toBe(true);
  });

  it("'O squad percebeu' põe primeiro a sugestão que chegou agora", () => {
    const older = { ...SUGGESTION, id: "sug-0", created_at: "2026-10-16T09:00:00Z" };
    const data = miolo({ suggestions: [older, SUGGESTION] });
    const cards = pendingCards(memoryItems(data, new Set(["sug-1"])), []);
    expect(cards.map((c) => (c.kind === "suggestion" ? c.item.id : ""))).toEqual(["sug-1", "sug-0"]);
  });

  it("'Alterações recentes' traz só o que aconteceu: a decisão sua, e a sugestão depois de decidida, nunca a pendente", () => {
    expect(memoryLog(miolo()).map((h) => [h.kind, h.value])).toEqual([["decided", "Não usar a palavra 'artesanal' nas legendas"]]);
    const confirmed = {
      ...SUGGESTION,
      state: "done" as const,
      decision: "confirm" as const,
      decided_at: "2026-10-16T12:00:00Z",
      resulting_fact_id: "f-new",
    };
    const log = memoryLog(miolo({ suggestions: [confirmed] }));
    expect(log.map((h) => h.kind)).toEqual(["confirmed", "suggested", "decided"]);
  });

  it("Realtime: memory_suggestion.created marca a sugestão como nova e faz a casca reler o servidor", () => {
    expect(MEMORY_EVENTS).toContain("memory_suggestion.created");
    expect(MEMORY_EVENTS).toContain("memory_suggestion.decided");
    const s0 = initialLiveState("ws-1");
    const s1 = liveReducer(s0, { type: "memory", workspaceId: "ws-1", event: "memory_suggestion.created", suggestion: { id: "sug-9" } });
    expect(s1.memoryNew).toEqual(["sug-9"]);
    expect(s1.version).toBe(1);
    const s2 = liveReducer(s1, { type: "memory", workspaceId: "ws-1", event: "memory_suggestion.decided", suggestion: { id: "sug-9" } });
    expect(s2.memoryNew).toEqual(["sug-9"]);
    expect(s2.version).toBe(2);
    // Canal de outro workspace não mexe em nada.
    expect(liveReducer(s2, { type: "memory", workspaceId: "ws-2", event: "memory_suggestion.created", suggestion: { id: "x" } })).toBe(s2);
  });
});

describe("Memória da Marca · tela (V4.5/V4.6)", () => {
  it("cabeçalho, faixa 'Squad · Para você confirmar', dossiê com o que o squad sabe e de onde vem", () => {
    renderWithShell(<MemoryView data={miolo()} business="Miolo" userInitial="M" />);
    expect(screen.getByRole("heading", { level: 1, name: "Memória da Marca" })).toBeInTheDocument();
    expect(screen.getByText("O que o seu squad sabe sobre você e o seu negócio.")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Buscar na memória" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Squad · Para você confirmar: 1 sugestão. Revisar" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/O squad ainda sabe pouco sobre Miolo/)).toBeInTheDocument();
    const keys = screen.getByText("Principais conhecimentos").parentElement!;
    expect(within(keys).getByRole("button", { name: "Público: Moradores de Pinheiros e Vila Madalena, 28 a 45 anos. Abrir" })).toBeInTheDocument();
    expect(within(keys).getByRole("button", { name: "Tom de comunicação: Acolhedor, direto, sem gíria. Abrir" })).toBeInTheDocument();
    expect(within(keys).getByRole("button", { name: "Proposta de valor: ainda não sabe. Contar agora" })).toBeInTheDocument();
    const from = screen.getByRole("group", { name: "De onde vem o que o squad sabe" });
    expect(within(from).getByRole("button", { name: "Onboarding e o que você contou: Declarado por você. Ver as fontes" })).toBeInTheDocument();
    expect(within(from).getByRole("button", { name: "Instagram: Não conectada. Ver as fontes" })).toBeInTheDocument();
  });

  it("'Otto percebeu' com a pergunta; o owner confirma e o squad passa a usar", async () => {
    const user = userEvent.setup();
    actions.decideSuggestionAction.mockResolvedValue({ ok: true, data: { factId: "f-new" } });
    const { shell } = renderWithShell(<MemoryView data={miolo()} business="Miolo" userInitial="M" />);
    const card = document.querySelector('.me-pend [data-mid="sug-1"]') as HTMLElement;
    expect(card).toHaveClass("ml-s", "is-hypo");
    expect(within(card).getByText("Otto percebeu · descobertas")).toBeInTheDocument();
    expect(within(card).getByText("Posts com bastidores do forno têm mais salvamentos?")).toBeInTheDocument();
    expect(within(card).getByText("Nada muda nas entregas até você confirmar.")).toBeInTheDocument();
    await user.click(within(card).getByRole("button", { name: "Confirmar" }));
    expect(actions.decideSuggestionAction).toHaveBeenCalledWith("sug-1", "confirm");
    await vi.waitFor(() => expect(shell.toast).toHaveBeenCalledWith("Confirmado. Todo o squad passa a usar.", "nexo"));
  });

  it("Corrigir abre a edição com o texto e 'Salvar como confirmado' manda a correção", async () => {
    const user = userEvent.setup();
    actions.decideSuggestionAction.mockResolvedValue({ ok: true, data: { factId: "f-new" } });
    renderWithShell(<MemoryView data={miolo()} business="Miolo" userInitial="M" />);
    const card = document.querySelector('.me-pend [data-mid="sug-1"]') as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "Corrigir" }));
    const box = within(card).getByRole("textbox", { name: "Corrigir o conhecimento" });
    expect(box).toHaveValue("Posts com bastidores do forno têm mais salvamentos");
    await user.clear(box);
    await user.type(box, "Bastidores do forno rendem mais salvamentos");
    await user.click(within(card).getByRole("button", { name: "Salvar como confirmado" }));
    expect(actions.decideSuggestionAction).toHaveBeenCalledWith("sug-1", "correct", "Bastidores do forno rendem mais salvamentos");
  });

  it("quem não é owner vê tudo em leitura: sem Confirmar, Corrigir nem Descartar", () => {
    renderWithShell(<MemoryView data={miolo()} business="Miolo" userInitial="M" />, makeShell({ canDecide: false }));
    const card = document.querySelector('.me-pend [data-mid="sug-1"]') as HTMLElement;
    expect(within(card).queryByRole("button", { name: "Confirmar" })).toBeNull();
    expect(within(card).queryByRole("button", { name: "Descartar" })).toBeNull();
    expect(within(card).getByText("Quem decide é o dono da conta")).toBeInTheDocument();
  });

  it("abas com contagem, busca com 'N resultados para' e o vazio da V4.5", async () => {
    const user = userEvent.setup();
    renderWithShell(<MemoryView data={miolo()} business="Miolo" userInitial="M" />);
    const tabs = screen.getByRole("group", { name: "Assuntos" });
    expect(within(tabs).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Tudo7",
      "Meu negócio2",
      "Minha marca2",
      "Meu público2",
      "Conhecimento e aprendizados1",
      "Conexões e fontes2",
    ]);
    await user.type(screen.getByRole("searchbox", { name: "Buscar na memória" }), "artesanal");
    expect(screen.getByText("1 resultado para “artesanal”")).toBeInTheDocument();
    await user.clear(screen.getByRole("searchbox", { name: "Buscar na memória" }));
    await user.type(screen.getByRole("searchbox", { name: "Buscar na memória" }), "bicicleta");
    expect(screen.getByText("Nada encontrado. Tente outra palavra ou adicione esse conhecimento.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Limpar a busca" }));
    expect(document.querySelectorAll(".me-br .me-r")).toHaveLength(7);
  });

  it("'Ver pelo especialista': o que o Otto consulta, sem sugestões nem conflitos", async () => {
    const user = userEvent.setup();
    renderWithShell(<MemoryView data={miolo()} business="Miolo" userInitial="M" />);
    await user.click(screen.getByRole("button", { name: "Ver o que o Otto consulta" }));
    expect(screen.getByText("O Otto consulta 6 conhecimentos")).toBeInTheDocument();
    expect(screen.getByText("Usa para planejar e escrever conteúdos. Sugestões e conflitos ficam de fora até você decidir.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ver tudo" }));
    expect(screen.queryByText("O Otto consulta 6 conhecimentos")).toBeNull();
  });

  it("a linha aberta mostra a origem, o estado por extenso, quem usa e o histórico", async () => {
    const user = userEvent.setup();
    renderWithShell(<MemoryView data={miolo()} business="Miolo" userInitial="M" />);
    await user.click(screen.getByRole("button", { name: "Tom de voz: Acolhedor, direto, sem gíria. Confirmado. Ver detalhes" }));
    const row = document.querySelector('.me-br [data-mid="f-tom"]') as HTMLElement;
    expect(row).toHaveClass("is-open", "is-ok");
    expect(within(row).getByText("Contado por você no cadastro")).toBeInTheDocument();
    expect(within(row).getByText("Confirmado por você · 01/10")).toBeInTheDocument();
    expect(within(row).getByText("Todo o squad consulta quando precisa")).toBeInTheDocument();
    expect(within(row).getByText("Entrou na memória: contado por você no cadastro")).toBeInTheDocument();
    expect(actions.factHistoryAction).toHaveBeenCalledWith("f-tom");
    // A sugestão: "Quem vai usar depois do seu ok" com Otto e Kaia.
    await user.click(screen.getByRole("button", { name: /^Bastidores: .*Sugerido\. Ver detalhes$/ }));
    const sug = document.querySelector('.me-br [data-mid="sug-1"]') as HTMLElement;
    expect(within(sug).getByText("Quem vai usar depois do seu ok")).toBeInTheDocument();
    expect(within(sug).getByText("Otto · Conteúdo")).toBeInTheDocument();
    expect(within(sug).getByText("Kaia · Criação")).toBeInTheDocument();
  });

  it("Conexões e fontes: estado de cada fonte e as permissões", async () => {
    const user = userEvent.setup();
    renderWithShell(<MemoryView data={miolo()} business="Miolo" userInitial="M" />);
    await user.click(within(screen.getByRole("group", { name: "Assuntos" })).getByRole("button", { name: /Conexões e fontes/ }));
    const list = document.querySelector(".me-sl") as HTMLElement;
    const ig = within(list).getByText("Instagram").closest("li")!;
    expect(ig).toHaveClass("me-src", "is-off");
    expect(within(ig).getByText("Não conectada")).toBeInTheDocument();
    expect(within(ig).getByText("Ler posts e métricas · Publicar só com sua autorização")).toBeInTheDocument();
    expect(within(list).getByText("5 conhecimentos")).toBeInTheDocument();
  });

  it("sem nada percebido ainda, o vazio do primeiro acesso; 'Alterações recentes' com a decisão real", () => {
    renderWithShell(
      <MemoryView data={miolo({ suggestions: [], dossier: { ...miolo().dossier, suggestions: [] } })} business="Miolo" userInitial="M" />,
    );
    expect(
      screen.getByText(
        "Quando o Nexo ler o site ou você conversar com o squad, o que ele perceber aparece aqui para você confirmar. Nada vira orientação sem o seu ok.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Precisa de você/ })).toBeNull();
    expect(screen.getByText("Você decidiu: não usar a palavra 'artesanal' nas legendas")).toBeInTheDocument();
  });
});
