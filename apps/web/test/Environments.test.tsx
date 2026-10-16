import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BrandEnvironment } from "@/components/env/brand/BrandEnvironment";
import { CrmEnvironment } from "@/components/env/crm/CrmEnvironment";
import { GrowthEnvironment } from "@/components/env/growth/GrowthEnvironment";
import type { StripNeed } from "@/components/env/NeedsStrip";
import { ResultsEnvironment } from "@/components/env/results/ResultsEnvironment";
import { StrategyEnvironment } from "@/components/env/strategy/StrategyEnvironment";
import { makeShell, renderWithShell } from "./render";

const UNAVAILABLE = "Ainda não disponível nesta versão.";
const shellWith = () => makeShell({ conversationIds: { room: "room-1", direct: { otto: "otto-1", bia: "bia-1", kaia: "kaia-1" } } });

/** Nenhum número na tela (regra do Documento Mestre §7: não inventar métrica). */
function expectNoNumbers(el: HTMLElement) {
  expect(el.textContent).not.toMatch(/\d/);
}

describe("Estratégia · Bia (primeiro acesso da V4.6)", () => {
  it("mostra só a direção estratégica vazia e o convite ao diagnóstico", () => {
    const { container } = renderWithShell(<StrategyEnvironment business="Miolo" needs={[]} />, shellWith());
    expect(screen.getByRole("heading", { level: 1, name: "Estratégia" })).toBeInTheDocument();
    expect(container.querySelector(".v4-id-d")).toHaveTextContent("Bia encontra onde está a oportunidade de Miolo.");
    const box = screen.getByRole("region", { name: "A Bia ainda não conhece Miolo o bastante para propor uma direção." });
    expect(within(box).getByText("Direção estratégica")).toHaveClass("ka-k");
    expect(within(box).getByText("Comece por um diagnóstico: ela usa o que você contar na conversa e pergunta o que faltar.")).toBeInTheDocument();
    // Nada além disso (V4.6 `bia.first`): só os botões da identidade e "Analisar meu negócio".
    expect(within(box).getAllByRole("button").map((b) => b.textContent)).toEqual(["Analisar meu negócio"]);
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(screen.queryByText(/Oportunidades identificadas|Planos e diagnósticos|Em análise/)).toBeNull();
    expectNoNumbers(container);
  });

  it("Analisar meu negócio abre a conversa do pedido (capacidade b-diag, 02.01) com o pedido escrito, sem enviar", async () => {
    const user = userEvent.setup();
    const { shell } = renderWithShell(<StrategyEnvironment business="Miolo" needs={[]} />, shellWith());
    await user.click(screen.getByRole("button", { name: "Analisar meu negócio" }));
    expect(shell.openConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: null,
        agent: "bia",
        draft: "Quero analisar meu negócio.",
        deliveryType: "02.01",
        context: expect.objectContaining({ kind: "capability", label: "Analisar meu negócio" }),
      }),
    );
  });
});

describe("Marca & Criação · Kaia (estúdio)", () => {
  it("bancada com Em produção 0, galeria com os sete filtros em 0 e o vazio sem peça inventada", () => {
    const { container } = renderWithShell(<BrandEnvironment business="Miolo" needs={[]} production={[]} />, shellWith());
    expect(screen.getByRole("heading", { level: 1, name: "Marca & Criação" })).toBeInTheDocument();
    const bench = screen.getByRole("region", { name: "Bancada da Kaia" });
    const prod = within(bench).getByRole("region", { name: "Em produção" });
    expect(prod.querySelector(".ka-n")).toHaveTextContent(/^0$/);
    const gal = screen.getByRole("region", { name: "Criações" });
    expect(within(gal).getByText("O que a Kaia criou para Miolo, com o que está em produção primeiro. Os mesmos arquivos da Biblioteca.")).toBeInTheDocument();
    const filters = within(gal).getByRole("group", { name: "Filtrar criações" });
    const cats = within(filters).getAllByRole("button");
    expect(cats.map((b) => b.querySelector("span")?.textContent)).toEqual([
      "Todas",
      "Redes sociais",
      "Carrosséis",
      "Identidade",
      "Promocionais",
      "Imagens",
      "Vídeo e motion",
    ]);
    expect(cats.map((b) => b.querySelector("small")?.textContent)).toEqual(["0", "0", "0", "0", "0", "0", "0"]);
    expect(screen.getByRole("button", { name: "Todas: nenhuma criação" })).toHaveAttribute("aria-pressed", "true");
    expect(within(gal).getByText("Nenhuma criação ainda.")).toBeInTheDocument();
    // A2b: as peças esperam o motor de imagem do dono, sem fornecedor e sem data.
    expect(within(gal).getByText("O que a Kaia criar para Miolo aparece aqui quando o motor de imagem chegar.")).toBeInTheDocument();
    const engine = within(bench).getByRole("region", { name: "Aguardando o motor de imagem" });
    expect(engine).toHaveTextContent("Até lá, nada é criado nem aparece aqui como pronto.");
    expect(container.querySelectorAll(".ka-t")).toHaveLength(0);
    // Os únicos números da tela são os zeros reais.
    expect(container.textContent?.match(/\d+/g)?.every((n) => n === "0")).toBe(true);
  });

  it("com filtro ativo, o último quadro é o novo pedido e explica a espera do motor de imagem (V4.3 KA_NEW, A2b)", async () => {
    const user = userEvent.setup();
    const { shell } = renderWithShell(<BrandEnvironment business="Miolo" needs={[]} production={[]} />, shellWith());
    await user.click(screen.getByRole("button", { name: "Redes sociais: nenhuma criação" }));
    expect(screen.getByRole("button", { name: "Redes sociais: nenhuma criação" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Para pedir mais, use a última peça desta lista.")).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma criação ainda.")).toBeNull();
    const tile = screen.getByRole("button", { name: "Nova peça para as redes: aguardando o motor de imagem" });
    expect(tile).toHaveClass("ka-t", "is-start");
    expect(tile).toHaveTextContent("Novo pedido");
    expect(tile).toHaveTextContent("Aguardando o motor de imagem");
    await user.click(tile);
    // Sem entrega visual (motor do dono), o pedido não abre uma conversa que ficaria sem resposta.
    expect(shell.openConversation).not.toHaveBeenCalled();
    expect(shell.toast).toHaveBeenCalledWith(
      "Nova peça para as redes: As peças da Kaia esperam o motor de imagem. Nada é criado antes de ele chegar.",
      "kaia",
    );
  });

  it("o que a Kaia tem em andamento de verdade entra em Em produção e no começo da galeria", () => {
    const production = [{ id: "w-1", title: "Cartaz de encomendas", single: true, href: "/app/miolo/squad/kaia/trabalho/w-1" }];
    renderWithShell(<BrandEnvironment business="Miolo" needs={[]} production={production} />, shellWith());
    const prod = screen.getByRole("region", { name: "Em produção" });
    expect(prod.querySelector(".ka-n")).toHaveTextContent(/^1$/);
    expect(within(prod).getByRole("button", { name: /Cartaz de encomendas/ })).toHaveTextContent("Em andamento");
    expect(screen.getByRole("button", { name: "Todas: 1 criação" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cartaz de encomendas, em produção. Abrir" })).toHaveTextContent("Kaia está criando");
    expect(screen.queryByText("Nenhuma criação ainda.")).toBeNull();
  });
});

describe("Growth Marketing · Kiwi (sem número inventado)", () => {
  it("identidade da V4.2, objetivo vazio que pede conexão e nenhum número ilustrativo", () => {
    const { container } = renderWithShell(<GrowthEnvironment business="Miolo" needs={[]} />, shellWith());
    expect(screen.getByRole("heading", { level: 1, name: "Growth Marketing" })).toBeInTheDocument();
    expect(container.querySelector(".v4-id-d")).toHaveTextContent("Kiwi cuida do crescimento de Miolo: busca, anúncios e mais visitas virando encomendas.");
    const goal = screen.getByRole("region", { name: "Nenhum objetivo de crescimento combinado ainda." });
    expect(within(goal).getByText("Objetivo de crescimento")).toHaveClass("ka-k");
    expect(within(goal).getByText("Conecte o Google Perfil ou envie a planilha de encomendas. Nada aparece aqui antes de existir um dado real.")).toBeInTheDocument();
    expect(within(goal).getByRole("link", { name: "Ver conexões" })).toHaveAttribute("href", "/app/miolo/memoria-da-marca");
    expectNoNumbers(container);
    for (const fake of ["27%", "6,6%", "R$ 0", "R$", "dados ilustrativos", "Kiwi percebeu", "panetone", "Mais encomendas pelo site no Natal"]) {
      expect(container.textContent).not.toContain(fake);
    }
  });

  it("três frentes em abas, com a regra de autorização e a ação que abre a conversa com a Kiwi", async () => {
    const user = userEvent.setup();
    const { shell } = renderWithShell(<GrowthEnvironment business="Miolo" needs={[]} />, shellWith());
    const list = screen.getByRole("tablist", { name: "Frentes de crescimento" });
    const tabs = within(list).getAllByRole("tab");
    expect(tabs.map((x) => x.querySelector(".kw-l-h")?.textContent)).toEqual(["Aquisição orgânica", "Campanhas pagas", "Conversão e testes"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    const pane = screen.getByRole("tabpanel", { name: /Aquisição orgânica/ });
    expect(within(pane).getByText("Buscas em que Miolo pode aparecer mais, em ordem de prioridade. Interesse estimado pela Kiwi.")).toBeInTheDocument();
    expect(within(pane).getByText("Nenhuma busca para mostrar ainda.")).toBeInTheDocument();

    await user.click(tabs[1]!);
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveTextContent("Nada no ar");
    expect(screen.getByText("Nenhum anúncio no ar. Nada é investido nem ativado sem a sua autorização.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Nova campanha" }));
    expect(shell.openConversation).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: null, agent: "kiwi", draft: "Quero planejar uma campanha paga." }),
    );

    tabs[1]!.focus();
    await user.keyboard("{ArrowRight}");
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
    expect(tabs[2]).toHaveFocus();
    expect(screen.getByText("Uma hipótese por vez, com o que conta como resultado combinado antes.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Novo teste" })).toBeInTheDocument();
  });

  it("a faixa Precisa de você aparece quando a Kiwi tem pendência real", () => {
    const need: StripNeed = { approvalId: "ap-9", agent: "kiwi", kind: "Para você autorizar", title: "Teste de anúncios", sub: "Aguarda você", cta: "Autorizar o trabalho", href: "/x" };
    renderWithShell(<GrowthEnvironment business="Miolo" needs={[need]} />, shellWith());
    expect(screen.getByRole("region", { name: "Precisa de você: 1" })).toBeInTheDocument();
  });
});

describe("CRM · Max (primeiro acesso da V4.6)", () => {
  it("Central de relacionamento vazia com as quatro fontes e os estados exatos", () => {
    const { container } = renderWithShell(<CrmEnvironment business="Miolo" needs={[]} />, shellWith());
    expect(screen.getByRole("heading", { level: 1, name: "CRM" })).toBeInTheDocument();
    const box = screen.getByRole("region", { name: "Sua base de clientes ainda não está aqui." });
    expect(within(box).getByText("Central de relacionamento")).toHaveClass("ka-k");
    expect(within(box).getByText("O Max começa pelos contatos que você já tem. Nada é enviado sem consentimento e sem a sua autorização.")).toBeInTheDocument();
    const rows = [...box.querySelectorAll(".mx-src")].map((r) => [r.querySelector("b")?.textContent, r.querySelector("small")?.textContent, r.querySelector("button")?.textContent ?? null]);
    expect(rows).toEqual([
      ["Planilha de clientes", "CSV ou Excel · ainda não importada", "Importar"],
      ["Plataforma da loja", "integração pendente", null],
      ["E-mail", "não conectado", "Conectar"],
      ["WhatsApp", "canal indisponível", "Saber mais"],
    ]);
    expect(box.querySelectorAll(".mx-src.is-off")).toHaveLength(4);
    expectNoNumbers(container);
  });

  it("Importar, Conectar e Saber mais mostram o aviso padrão e não abrem nada", async () => {
    const user = userEvent.setup();
    const { shell } = renderWithShell(<CrmEnvironment business="Miolo" needs={[]} />, shellWith());
    for (const name of ["Importar a planilha de clientes", "Conectar o e-mail", "Saber mais sobre o WhatsApp"]) {
      await user.click(screen.getByRole("button", { name }));
    }
    expect(shell.toast).toHaveBeenCalledTimes(3);
    expect(shell.toast).toHaveBeenNthCalledWith(1, UNAVAILABLE, "max");
    expect(shell.openConversation).not.toHaveBeenCalled();
  });
});

describe("Resultados · Íris (primeiro acesso da V4.6)", () => {
  it("diz o que falta, o que a Íris vai acompanhar e leva às conexões, sem nenhum número", () => {
    const { container } = renderWithShell(<ResultsEnvironment business="Miolo" needs={[]} />, shellWith());
    expect(screen.getByRole("heading", { level: 1, name: "Resultados" })).toBeInTheDocument();
    const box = screen.getByRole("region", { name: "A Íris ainda não tem números para ler" });
    expect(within(box).getByText("Conecte o Instagram ou envie a planilha de encomendas. Nada aparece aqui antes de existir um dado real.")).toBeInTheDocument();
    const list = within(box).getByRole("list", { name: "O que a Íris vai acompanhar" });
    expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Encomendas pelo site",
      "Visitas vindas do Instagram",
      "Alcance no Instagram",
    ]);
    expect(within(box).getByRole("link", { name: "Ver conexões" })).toHaveAttribute("href", "/app/miolo/memoria-da-marca");
    expect(container.querySelector(".rs-kpis, .rs-ch, .rs-cpc")).toBeNull();
    expectNoNumbers(container);
  });
});
