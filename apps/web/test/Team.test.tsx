import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LiveProvider } from "@/components/product/live";
import { TeamChats } from "@/components/team/TeamChats";
import { TeamView } from "@/components/team/TeamView";
import type { ChatRow, TeamPending, TeamWork } from "@/components/team/team-data";
import { renderWithShell } from "./render";

const NOW = new Date("2026-10-16T11:00:00-03:00");

const WORK: TeamWork = {
  id: "wi-1",
  title: "Legenda do post de sábado: pão de fermentação longa",
  status: "needs_you",
  agent: "otto",
  collaborators: [],
  deliveryType: "04.01",
  waitVersion: 1,
  href: "/app/miolo/squad/otto/trabalho/wi-1",
};
const PENDING: TeamPending[] = [{ agent: "otto", workItemId: "wi-1", version: 1, deliveryType: "04.01" }];

function chat(over: Partial<ChatRow> & Pick<ChatRow, "id" | "kind">): ChatRow {
  return { agent: null, title: null, topic: null, unread: 0, contextType: null, contextId: null, at: "2026-10-16T09:10:00-03:00", last: null, ...over };
}

const CHATS: ChatRow[] = [
  chat({
    id: "otto-1",
    kind: "agent_direct",
    agent: "otto",
    title: "Conversa com o Otto",
    last: { by: "user", agent: null, text: "Tom acolhedor e direto, sem gíria." },
  }),
  chat({
    id: "room-1",
    kind: "squad_room",
    agent: "nexo",
    title: "Sala do Squad",
    topic: "Campanha de Natal",
    at: "2026-10-15T09:05:00-03:00",
    last: { by: "agent", agent: "kaia", text: "3 de 5 peças prontas." },
  }),
  chat({
    id: "obj-1",
    kind: "object",
    agent: "otto",
    title: "Legenda do sábado",
    contextType: "work_item",
    contextId: "wi-1",
    unread: 2,
    at: "2026-10-14T16:00:00-03:00",
    last: { by: "agent", agent: "otto", text: "" },
  }),
];

function renderTeam(props: { works?: TeamWork[]; pending?: TeamPending[]; chats?: ChatRow[] } = {}) {
  return renderWithShell(<TeamView business="Miolo" chats={props.chats ?? CHATS} works={props.works ?? []} pending={props.pending ?? []} />);
}

describe("Minha Equipe & Conversas · aba Equipe", () => {
  it("mostra os sete com nome e área, a Kaia escolhida e o subtítulo da aba", () => {
    renderTeam();
    expect(screen.getByRole("heading", { level: 1, name: "Minha Equipe & Conversas" })).toBeInTheDocument();
    expect(screen.getByText("Sete especialistas que conhecem Miolo. Escolha um para ver o que está fazendo.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^Equipe/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /^Equipe/ })).toHaveTextContent("Equipe7");
    expect(screen.getByRole("tab", { name: /^Conversas/ })).toHaveTextContent("Conversas3");
    const stage = screen.getByRole("region", { name: "Escolha um especialista" });
    const names = within(stage)
      .getAllByRole("button")
      .map((b) => b.textContent);
    expect(names).toEqual(["NexoProjetos", "BiaEstratégia", "KaiaMarca & Criação", "OttoConteúdo", "KiwiGrowth", "MaxCRM", "ÍrisResultados"]);
    expect(within(stage).getByRole("button", { name: "Kaia · Marca e Criação" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { level: 2, name: "Kaia" })).toBeInTheDocument();
    expect(screen.getByText("Marca e Criação")).toBeInTheDocument();
    expect(screen.getByText("Dou forma à marca de Miolo em cada peça.")).toBeInTheDocument();
    expect(screen.getByText("Disponível.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir a Sala do Squad" })).toHaveAttribute("href", "/app/miolo/sala-do-squad");
  });

  it("perfil oficial de cada um: a Kiwi é Growth Marketing, com o artigo da decisão do dono", async () => {
    renderTeam();
    await userEvent.click(screen.getByRole("button", { name: "Kiwi · Growth Marketing" }));
    expect(screen.getByRole("heading", { level: 2, name: "Kiwi" })).toBeInTheDocument();
    expect(screen.getByText("Growth Marketing")).toBeInTheDocument();
    expect(screen.getByText("Faço Miolo crescer: mais gente encontrando, mais visitas virando encomendas.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Conversar com a Kiwi" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Max · CRM e Relacionamento" }));
    expect(screen.getByRole("button", { name: "Conversar com o Max" })).toBeInTheDocument();
    expect(screen.getByText("CRM e Relacionamento")).toBeInTheDocument();
  });

  it("abas do perfil: Agora (vazio da V4.6), Competências, Entregas (vazio) e Trabalha com", async () => {
    renderTeam();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Equipe7", "Conversas3", "Agora", "Competências", "Entregas", "Trabalha com"]);
    expect(
      screen.getByText("Nada em andamento agora. Posts, campanhas, materiais da loja e identidade visual, sempre com a cara de Miolo."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Competências" }));
    for (const skill of ["Direção de arte", "Peças para redes sociais", "Materiais para a loja", "Identidade visual"]) {
      expect(screen.getByText(skill)).toBeInTheDocument();
    }
    await userEvent.click(screen.getByRole("tab", { name: "Entregas" }));
    expect(screen.getByText("Ainda sem entregas para Miolo.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Trabalha com" }));
    const colleagues = screen.getAllByRole("button").filter((b) => b.classList.contains("ps-with-i"));
    expect(colleagues.map((b) => b.textContent)).toEqual(["BiaEstratégia", "OttoConteúdo"]);
    await userEvent.click(colleagues[0]!);
    expect(screen.getByRole("heading", { level: 2, name: "Bia" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Agora" })).toHaveAttribute("aria-selected", "true");
  });

  it("Conversar abre a conversa direta mais recente em tela cheia; sem conversa, um rascunho", async () => {
    const { shell } = renderTeam();
    await userEvent.click(screen.getByRole("button", { name: "Conversar com a Kaia" }));
    expect(shell.openConversation).toHaveBeenLastCalledWith({ conversationId: null, agent: "kaia" }, "full");
    await userEvent.click(screen.getByRole("button", { name: "Otto · Conteúdo e Comunicação" }));
    await userEvent.click(screen.getByRole("button", { name: "Conversar com o Otto" }));
    expect(shell.openConversation).toHaveBeenLastCalledWith({ conversationId: "otto-1", agent: "otto" }, "full");
  });

  it("Pedir algo lista os pedidos comuns e abre a conversa com o pedido escrito", async () => {
    const { shell } = renderTeam();
    await userEvent.click(screen.getByRole("button", { name: "Pedir algo" }));
    const menu = screen.getByRole("menu", { name: "Pedidos comuns" });
    expect(within(menu).getAllByRole("menuitem").map((m) => m.textContent)).toEqual([
      "Criar um post para o Dia Mundial do Pão",
      "Um cartaz de encomendas para o balcão",
      "Novas capas para os destaques",
    ]);
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Um cartaz de encomendas para o balcão" }));
    expect(shell.openConversation).toHaveBeenLastCalledWith(
      { conversationId: null, agent: "kaia", draft: "Um cartaz de encomendas para o balcão" },
      "full",
    );
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("o agora e o trabalho vêm do estado real: o Otto aguarda a aprovação da v1", async () => {
    renderWithShell(
      <LiveProvider
        workspaceId="ws-1"
        pending={[{ id: "ap-1", agent: "otto", kind: "review", workItemId: "wi-1" }]}
        subscribe={() => () => {}}
      >
        <TeamView business="Miolo" chats={CHATS} works={[WORK]} pending={PENDING} />
      </LiveProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Otto · Conteúdo e Comunicação" }));
    expect(screen.getByText("Aguarda a sua aprovação na v1 da legenda.")).toBeInTheDocument();
    const row = screen.getByRole("button", { name: /Legenda do post de sábado/ });
    expect(within(row).getByText("v1 aguarda sua aprovação")).toBeInTheDocument();
    expect(within(row).getByText("Aguarda você")).toBeInTheDocument();
    expect(row.querySelector(".v41-tag.is-you .wk-sg.is-you")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Nexo · Coordenação de Marketing" }));
    expect(screen.getByText("Disponível. Peça qualquer coisa.")).toBeInTheDocument();
  });
});

describe("Minha Equipe & Conversas · aba Conversas", () => {
  async function openChats() {
    const r = renderTeam({ works: [WORK] });
    await userEvent.click(screen.getByRole("tab", { name: /Conversas/ }));
    return r;
  }

  it("lista as conversas da API com título, quem, última mensagem, hora e não lidas", async () => {
    await openChats();
    expect(screen.getByText("Tudo o que você conversou com o squad, por assunto e por contexto.")).toBeInTheDocument();
    const rows = document.querySelectorAll(".ps-ch");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Conversa com o Otto");
    expect(rows[0]).toHaveTextContent("Otto · Conteúdo");
    expect(rows[0]).toHaveTextContent("Você: Tom acolhedor e direto, sem gíria.");
    expect(rows[1]).toHaveTextContent("Sala do Squad · Campanha de Natal");
    expect(rows[1]).toHaveTextContent("todos os especialistas");
    expect(rows[1]).toHaveTextContent("Kaia: 3 de 5 peças prontas.");
    expect(rows[2]).toHaveTextContent("Otto · Conteúdo · sobre um contexto");
    expect(rows[2]).toHaveTextContent("Otto: enviou um material");
    expect(rows[2]!.querySelector(".ps-udot")).not.toBeNull();
    expect(rows[0]!.querySelector(".ps-udot")).toBeNull();
    expect(screen.getByRole("tab", { name: /Conversas/ }).querySelector(".eq-dot")).not.toBeNull();
  });

  it("filtra por avatar e pela busca; sem resultado, o vazio limpa os filtros", async () => {
    await openChats();
    await userEvent.click(screen.getByRole("button", { name: "Sala do Squad" }));
    expect(document.querySelectorAll(".ps-ch")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Sala do Squad" }));
    expect(document.querySelectorAll(".ps-ch")).toHaveLength(3);
    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar conversas" }), "acolhedor");
    expect(document.querySelectorAll(".ps-ch")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Kaia" }));
    expect(document.querySelectorAll(".ps-ch")).toHaveLength(0);
    expect(screen.getByText("Nenhuma conversa com esse filtro.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(document.querySelectorAll(".ps-ch")).toHaveLength(3);
    expect(screen.getByRole("searchbox", { name: "Buscar conversas" })).toHaveValue("");
  });

  it("abre a conversa existente em tela cheia (a de objeto leva o contexto)", async () => {
    const { shell } = await openChats();
    await userEvent.click(screen.getByText("Conversa com o Otto"));
    expect(shell.openConversation).toHaveBeenLastCalledWith({ conversationId: "otto-1", agent: "otto" }, "full");
    await userEvent.click(screen.getByText("Legenda do sábado"));
    expect(shell.openConversation).toHaveBeenLastCalledWith(
      { conversationId: "obj-1", agent: "otto", context: { kind: "work_item", label: WORK.title, href: WORK.href } },
      "full",
    );
  });

  it("Nova conversa com o especialista do filtro abre um rascunho novo (fresh)", async () => {
    const { shell } = await openChats();
    expect(screen.queryByRole("button", { name: /Nova conversa/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Kaia" }));
    await userEvent.click(screen.getByRole("button", { name: "Nova conversa com a Kaia" }));
    expect(shell.openConversation).toHaveBeenLastCalledWith({ conversationId: null, agent: "kaia", fresh: true }, "full");
  });

  it("a hora é a de hoje ou o dia, como o seletor de conversas", () => {
    renderWithShell(<TeamChats chats={CHATS} works={[]} now={NOW} />);
    const times = [...document.querySelectorAll(".ps-ch-e > i")].map((i) => i.textContent);
    expect(times).toEqual(["09:10", "15/10", "14/10"]);
  });
});
