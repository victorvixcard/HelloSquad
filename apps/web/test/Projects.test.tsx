import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { columnItems, familyOf, visibleWorks, type BoardWork } from "@/components/env/projects/board";
import { ProjectsView, type ProjectsData } from "@/components/env/projects/ProjectsView";
import { makeShell, renderWithShell } from "./render";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/app/miolo/squad/nexo",
}));

const TITLE = "Legenda do post de sábado: pão de fermentação longa";
const HREF = "/app/miolo/squad/nexo/trabalho/wi-1";

// O seed da Miolo: um trabalho needs_you do Otto, com a revisão da v1 pendente; nenhum projeto.
const SEED: BoardWork = {
  id: "wi-1",
  title: TITLE,
  status: "needs_you",
  lead: "otto",
  co: [],
  project: null,
  href: HREF,
  need: { cta: "Revisar a legenda", title: TITLE, href: HREF, version: 1, due: null },
};

function data(over: Partial<ProjectsData> = {}): ProjectsData {
  return { business: "Miolo", needs: [], projects: [], works: [SEED], ...over };
}

function work(id: string, status: BoardWork["status"], over: Partial<BoardWork> = {}): BoardWork {
  return { id, title: `Trabalho ${id}`, status, lead: "kaia", co: [], project: null, href: `/app/miolo/squad/nexo/trabalho/${id}`, need: null, ...over };
}

const lane = (name: RegExp) => screen.getByRole("region", { name });

beforeEach(() => push.mockReset());

describe("Projetos · Nexo (V4.6)", () => {
  it("sem projeto, o roadmap mostra o vazio da V4.6 e começa pela Campanha de Natal na Sala do Squad", async () => {
    const user = userEvent.setup();
    const shell = makeShell();
    renderWithShell(<ProjectsView data={data()} />, shell);
    expect(screen.getByRole("heading", { name: "Roadmap de projetos" })).toBeInTheDocument();
    expect(screen.getByText("Nenhum projeto ainda")).toBeInTheDocument();
    expect(
      screen.getByText("Projetos são pedidos maiores, como uma campanha. O Nexo monta o squad, organiza as etapas e te chama quando a decisão é sua."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Começar pela Campanha de Natal" }));
    expect(shell.openConversation).toHaveBeenCalledWith(
      { conversationId: "room-1", agent: null, room: true, draft: "Quero uma campanha de Natal para vender mais panetones." },
      "full",
    );
  });

  it("Seu Squad está trabalhando e Próximos marcos mostram os vazios exatos da V4.6", () => {
    renderWithShell(<ProjectsView data={data()} />);
    expect(screen.getByRole("heading", { name: "Seu Squad está trabalhando" })).toBeInTheDocument();
    expect(screen.getByText("Ninguém em produção agora. Peça algo e o Nexo organiza quem faz.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Próximos marcos" })).toBeInTheDocument();
    expect(screen.getByText("Nenhum marco com data nos próximos dias.")).toBeInTheDocument();
  });

  it("trabalho em andamento aparece em Seu Squad está trabalhando e abre o detalhe", async () => {
    const user = userEvent.setup();
    renderWithShell(<ProjectsView data={data({ works: [work("w2", "in_progress", { lead: "bia", title: "Diagnóstico da Miolo" })] })} />);
    expect(screen.queryByText("Ninguém em produção agora. Peça algo e o Nexo organiza quem faz.")).toBeNull();
    const card = screen.getByRole("heading", { name: "Seu Squad está trabalhando" }).closest("section")!;
    await user.click(within(card).getByRole("button", { name: /Diagnóstico da Miolo/ }));
    expect(push).toHaveBeenCalledWith("/app/miolo/squad/nexo/trabalho/w2");
  });

  it("Conversar com Nexo sobre quem está trabalhando abre a conversa do Nexo com o resumo em contexto", async () => {
    const user = userEvent.setup();
    const shell = makeShell({ conversationIds: { room: "room-1", direct: { nexo: "nexo-1" } } });
    renderWithShell(<ProjectsView data={data()} />, shell);
    await user.click(screen.getByRole("button", { name: "Conversar com Nexo sobre quem está trabalhando" }));
    expect(shell.openConversation).toHaveBeenCalledWith({
      conversationId: "nexo-1",
      agent: "nexo",
      context: { kind: "env", label: "Seu Squad está trabalhando", href: "/app/miolo/squad/nexo", meta: "Resumo · Projetos" },
    });
  });

  it("Todos os trabalhos abre no Quadro com as quatro colunas e o trabalho do seed em Precisa de você", () => {
    renderWithShell(<ProjectsView data={data()} />);
    expect(screen.getByRole("heading", { name: "Todos os trabalhos" })).toBeInTheDocument();
    expect(screen.getByText("Projetos, entregas pontuais e ciclos do Modo Autônomo, pela situação de cada um.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quadro" })).toHaveAttribute("aria-pressed", "true");
    const you = lane(/^Precisa de você, 1 trabalho$/);
    expect(within(you).getByRole("heading", { name: TITLE })).toBeInTheDocument();
    expect(within(you).getByText("v1 aguarda sua aprovação")).toBeInTheDocument();
    expect(within(you).getByText("Entrega")).toBeInTheDocument();
    expect(you.querySelector(".wk-card")).toHaveClass("is-you");
    // As outras colunas mostram o vazio de cada uma (L8875).
    expect(within(lane(/^Em andamento, 0 trabalhos$/)).getByText("Nada em produção")).toBeInTheDocument();
    expect(within(lane(/^Programados, 0 trabalhos$/)).getByText("Nada programado")).toBeInTheDocument();
    expect(within(lane(/^Concluídos, 0 trabalhos$/)).getByText("Nada concluído ainda")).toBeInTheDocument();
  });

  it("o cartão diz quem responde e leva a decisão; o cartão e a ação abrem o detalhe do trabalho", async () => {
    const user = userEvent.setup();
    renderWithShell(<ProjectsView data={data()} />);
    const you = lane(/^Precisa de você/);
    expect(you.querySelector(".wk-team")).toHaveAttribute("title", "Otto responde");
    const cta = within(you).getByRole("button", { name: `Revisar a legenda: ${TITLE}` });
    expect(cta).toHaveTextContent("Revisar");
    await user.click(cta);
    expect(push).toHaveBeenLastCalledWith(HREF);
    await user.click(within(you).getByRole("button", { name: `${TITLE}. Aguarda você: v1 aguarda sua aprovação. Próximo passo: Revisar a legenda. Otto. Abrir o trabalho` }));
    expect(push).toHaveBeenLastCalledWith(HREF);
    expect(document.querySelector(".wk-card .wk-bar, .wk-card progress, [role=progressbar]")).toBeNull();
  });

  it("mapa de situação da FLUXOS §10.2: cada status na sua coluna, pausados por último, sem desenho fora do Quadro", () => {
    expect(familyOf("needs_you")).toBe("you");
    expect(familyOf("in_progress")).toBe("and");
    expect(familyOf("paused")).toBe("pause");
    expect(familyOf("scheduled")).toBe("prog");
    expect(familyOf("approved")).toBe("done");
    expect(familyOf("done")).toBe("done");
    for (const s of ["draft", "blocked", "failed", "cancelled"] as const) expect(familyOf(s)).toBeNull();
    const items = visibleWorks([work("p", "paused"), work("a", "in_progress"), work("x", "draft"), work("c", "cancelled")]);
    expect(columnItems(items, "and").map((w) => w.id)).toEqual(["a", "p"]);
    expect(items.map((w) => w.id)).not.toContain("x");
  });

  it("o Quadro mostra cada família com o seu sinal e os colaboradores (· com …)", () => {
    const works = [
      SEED,
      work("w2", "in_progress", { lead: "kaia", co: ["otto", "bia", "kiwi"] }),
      work("w3", "paused", { lead: "max" }),
      work("w4", "scheduled", { lead: "otto" }),
      work("w5", "approved", { lead: "bia" }),
      work("w6", "done", { lead: "iris" }),
      work("w7", "failed", { lead: "iris" }),
    ];
    const { container } = renderWithShell(<ProjectsView data={data({ works })} />);
    expect(lane(/^Em andamento, 2 trabalhos$/)).toBeInTheDocument();
    expect(lane(/^Programados, 1 trabalho$/)).toBeInTheDocument();
    expect(lane(/^Concluídos, 2 trabalhos$/)).toBeInTheDocument();
    const and = lane(/^Em andamento/);
    const cards = and.querySelectorAll(".wk-card");
    expect(cards[1]).toHaveClass("is-paused");
    expect(cards[0]!.querySelector(".wk-team")).toHaveAttribute("title", "Kaia responde · com Otto, Bia e Kiwi");
    expect(within(cards[0] as HTMLElement).getByText("+1")).toBeInTheDocument();
    expect(within(cards[1] as HTMLElement).getByText("Pausado", { selector: ".wk-n span" })).toBeInTheDocument();
    expect(within(lane(/^Concluídos/)).getAllByText("Aprovado", { selector: ".wk-n span" })).toHaveLength(2);
    // Sinal é forma: um svg wk-sg por coluna com a família (anel, ponto, relógio, check).
    for (const k of ["you", "and", "prog", "done"]) expect(container.querySelector(`.wk-lane.is-${k} .wk-lane-h .wk-sg`)).not.toBeNull();
    expect(screen.queryByText("Trabalho w7")).toBeNull();
  });

  it("filtro por especialista e por tipo; Limpar filtros volta a mostrar tudo", async () => {
    const user = userEvent.setup();
    renderWithShell(<ProjectsView data={data({ works: [SEED, work("w2", "in_progress", { lead: "bia", project: "Campanha de Natal" })] })} />);
    await user.click(screen.getByRole("button", { name: "Mostrar só trabalhos com a Bia" }));
    expect(screen.getByRole("button", { name: "Mostrando trabalhos com a Bia" })).toHaveAttribute("aria-pressed", "true");
    expect(lane(/^Precisa de você, 0 trabalhos$/)).toHaveTextContent("Nenhuma decisão pendente");
    expect(within(lane(/^Em andamento, 1 trabalho$/)).getByText("Campanha de Natal", { selector: ".wk-k-p" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mostrar trabalhos de todos os especialistas" }));
    expect(lane(/^Precisa de você, 1 trabalho$/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tipo de trabalho: todos" }));
    const menu = screen.getByRole("menu", { name: "Tipo de trabalho" });
    expect(within(menu).getAllByRole("menuitemradio").map((m) => m.textContent)).toEqual(["Todos", "Entregas pontuais", "Projetos"]);
    await user.click(within(menu).getByRole("menuitemradio", { name: "Projetos" }));
    expect(screen.getByRole("button", { name: "Tipo de trabalho: projetos" })).toHaveTextContent("Projetos");
    expect(lane(/^Precisa de você, 0 trabalhos$/)).toBeInTheDocument();
    expect(within(lane(/^Em andamento, 1 trabalho$/)).getByText("Campanha de Natal")).toBeInTheDocument();

    // Na Lista, filtro sem resultado: o vazio com "Limpar filtros" (L9103).
    await user.click(screen.getByRole("button", { name: "Mostrar só trabalhos com a Íris" }));
    await user.click(screen.getByRole("button", { name: "Lista" }));
    expect(screen.getByText("Nenhum trabalho com esses filtros")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(screen.getByRole("button", { name: "Tipo de trabalho: todos" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Precisa de você, 1" })).toBeInTheDocument();
  });

  it("Lista: grupos pela situação, com Situação, Responsável, Data e Próximo passo", async () => {
    const user = userEvent.setup();
    renderWithShell(<ProjectsView data={data()} />);
    await user.click(screen.getByRole("button", { name: "Lista" }));
    const group = screen.getByRole("region", { name: "Precisa de você, 1" });
    for (const col of ["Situação", "Responsável", "Data", "Próximo passo"]) expect(within(group).getByText(col)).toBeInTheDocument();
    const row = group.querySelector(".wk-row")!;
    expect(row).toHaveClass("is-you");
    expect(within(row as HTMLElement).getByText("Aguarda você")).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText("Otto", { selector: ".wk-r-ln" })).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText("—")).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText("Entrega · v1 aguarda sua aprovação")).toBeInTheDocument();
    await user.click(within(row as HTMLElement).getByRole("button", { name: /Abrir o trabalho$/ }));
    expect(push).toHaveBeenLastCalledWith(HREF);
    // Grupos vazios não aparecem na Lista.
    expect(screen.queryByRole("region", { name: /^Em andamento, 0$/ })).toBeNull();
  });

  it("Biblioteca: Tudo, Peças e Documentos com contagem e o vazio da V4.6 (a legenda não é peça nem documento)", async () => {
    const user = userEvent.setup();
    renderWithShell(<ProjectsView data={data()} />);
    await user.click(screen.getByRole("button", { name: "Biblioteca" }));
    const fmt = screen.getByRole("group", { name: "Formato" });
    expect(within(fmt).getAllByRole("button").map((b) => b.textContent)).toEqual(["Tudo0", "Peças0", "Documentos0"]);
    expect(screen.queryByRole("button", { name: /^Tipo de trabalho/ })).toBeNull();
    expect(screen.getByText("Ainda não há materiais")).toBeInTheDocument();
    expect(screen.getByText("As peças e os documentos que o squad produzir aparecem aqui, com a situação de cada um.")).toBeInTheDocument();
  });

  it("conta sem trabalhos: Nenhum trabalho ainda, no Quadro e na Lista, sem Limpar filtros", async () => {
    const user = userEvent.setup();
    renderWithShell(<ProjectsView data={data({ works: [] })} />);
    const text = "Peça algo ao squad em Novo pedido. O Nexo organiza quem faz, e o que precisar de você aparece aqui primeiro.";
    expect(screen.getByText("Nenhum trabalho ainda")).toBeInTheDocument();
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /^Precisa de você,/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Lista" }));
    expect(screen.getByText("Nenhum trabalho ainda")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).toBeNull();
  });

  it("projeto da API aparece no roadmap, com o detalhe ao clicar (sem faixa no tempo: a API não tem datas)", async () => {
    const user = userEvent.setup();
    const projects: ProjectsData["projects"] = [
      { id: "p1", name: "Campanha de Natal", objective: "Vender 400 panetones", status: "active", lead: "nexo", works: [{ id: "w2", title: "Peças de Natal", agent: "kaia", href: "/x" }] },
      { id: "p2", name: "Reativação de clientes", objective: null, status: "paused", lead: "max", works: [] },
    ];
    renderWithShell(<ProjectsView data={data({ projects })} />);
    expect(screen.queryByText("Nenhum projeto ainda")).toBeNull();
    expect(screen.getByText("1 ativo · 1 pausado")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Campanha de Natal: Em andamento. Ver o detalhe do projeto" }));
    const detail = screen.getByRole("region", { name: "Detalhe do projeto Campanha de Natal" });
    expect(within(detail).getByText("Vender 400 panetones")).toBeInTheDocument();
    expect(within(detail).getByText("Trabalhos pedidos neste projeto · 1")).toBeInTheDocument();
    expect(within(detail).getByText("Sem prazo")).toBeInTheDocument();
  });
});
