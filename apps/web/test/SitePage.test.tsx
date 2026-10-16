import { resolveServer } from "./site-server";
import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { Landing } from "@/components/site/Landing";
import { Blocks, Inline } from "@/components/site/Prose";
import { SitePage } from "@/components/site/SitePage";
import { getSiteContent, questionsOf } from "@/lib/site-content";

async function renderServer(node: ReactElement) {
  return render((await resolveServer(node)) as ReactElement);
}

const ldTypes = () =>
  JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!)["@graph"].map(
    (node: { "@type": string }) => node["@type"],
  );

describe("Blocks e Inline: o conteúdo da N2a em HTML semântico", () => {
  it("tabela com legenda, cabeçalho de coluna e de linha, e foco de teclado para rolar no celular", () => {
    render(
      <Blocks
        label="Quem faz o quê"
        blocks={[{ type: "table", head: ["Especialista", "Área"], rows: [["[**Nexo**](/squad/nexo)", "Projetos"]] }]}
      />,
    );
    const region = screen.getByRole("table", { name: "Quem faz o quê" });
    expect(region.parentElement).toHaveAttribute("tabindex", "0");
    expect(within(region).getAllByRole("columnheader").map((c) => c.textContent)).toEqual(["Especialista", "Área"]);
    expect(within(region).getByRole("rowheader")).toHaveTextContent("Nexo");
    expect(within(region).getByRole("link", { name: "Nexo" })).toHaveAttribute("href", "/squad/nexo");
  });

  it("pergunta vira h3 com a resposta embaixo; listas numeradas e com marcador", () => {
    render(
      <Blocks
        blocks={[
          { type: "qa", question: "O Otto publica sozinho?", answer: [{ type: "p", text: "Não. Aprovar um texto não autoriza publicar." }] },
          { type: "ol", items: ["Primeiro", "Segundo"] },
          { type: "ul", items: ["*Exemplo fictício.*"] },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { level: 3, name: "O Otto publica sozinho?" })).toBeInTheDocument();
    expect(screen.getByText(/Aprovar um texto/).tagName).toBe("P");
    expect(screen.getAllByRole("list").map((l) => l.tagName)).toEqual(["OL", "UL"]);
    expect(screen.getByText("Exemplo fictício.").tagName).toBe("EM");
  });

  it("texto com HTML continua texto (nada vira HTML cru)", () => {
    render(
      <p>
        <Inline text="<img src=x onerror=alert(1)> e **negrito**" />
      </p>,
    );
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByText("negrito").tagName).toBe("STRONG");
  });
});

describe("SitePage", () => {
  it("Otto em pt-BR: título, migalhas, seções, botão sem preço e JSON-LD de serviço", async () => {
    await renderServer(<SitePage locale="pt-BR" page="squad-otto" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Otto, conteúdo e comunicação");
    const crumbs = screen.getByRole("navigation", { name: "Você está aqui" });
    expect(within(crumbs).getByRole("link", { name: "Início" })).toHaveAttribute("href", "/");
    expect(within(crumbs).getByRole("link", { name: "Squad" })).toHaveAttribute("href", "/squad");
    expect(within(crumbs).getByText("Otto, Conteúdo e Comunicação")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { level: 2, name: "O que o Otto entrega" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "O que o Otto entrega" })).getByRole("table")).toBeInTheDocument();
    const ctas = screen.getAllByRole("link", { name: "Começar com o squad" });
    expect(ctas.length).toBeGreaterThanOrEqual(1);
    for (const cta of ctas) expect(cta).toHaveAttribute("href", "/criar-conta");
    expect(ldTypes()).toEqual(["BreadcrumbList", "Service"]);
    expect(document.body.textContent).not.toMatch(/grátis|R\$|\{\{/);
  });

  it("FAQ em es: perguntas como h3, navegação e troca de idioma nas rotas certas", async () => {
    await renderServer(<SitePage locale="es" page="faq" />);
    const questions = questionsOf((await getSiteContent("es")).pages.faq);
    expect(screen.getAllByRole("heading", { level: 3 }).length).toBe(questions.length);
    const nav = screen.getByRole("navigation", { name: "Navegación del sitio" });
    expect(within(nav).getByRole("link", { name: "Cómo funciona" })).toHaveAttribute("href", "/es/como-funciona");
    expect(within(nav).getByRole("link", { name: "Preguntas" })).toHaveAttribute("aria-current", "page");
    const langs = screen.getByRole("navigation", { name: "Idioma" });
    expect(within(langs).getByRole("link", { name: "Português (Brasil)" })).toHaveAttribute("href", "/faq");
    expect(within(langs).getByRole("link", { name: "English" })).toHaveAttribute("href", "/en/faq");
    expect(within(langs).getByRole("link", { name: "Español" })).toHaveAttribute("aria-current", "page");
    expect(ldTypes()).toEqual(["BreadcrumbList", "FAQPage"]);
  });

  it("Squad em en: os sete agentes linkados para as páginas deles", async () => {
    await renderServer(<SitePage locale="en" page="squad" />);
    expect(screen.getByRole("link", { name: "Íris, Data & Results" })).toHaveAttribute("href", "/en/squad/iris");
    expect(ldTypes()).toEqual(["BreadcrumbList", "ItemList"]);
  });
});

describe("Landing", () => {
  it("Hero da R32 sem mudança; seções da R32 com links para as páginas novas", async () => {
    await renderServer(<Landing locale="pt-BR" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Você cuida do seu negócio\.\s*Seu squad de IA assume o marketing\./,
    );
    // Cabeçalho como a R32 no topo (wordmark e "Entrar"); a navegação do site fica no rodapé.
    expect(screen.queryByRole("navigation", { name: "Navegação do site" })).toBeNull();
    expect(within(screen.getByRole("contentinfo")).getByRole("link", { name: "Como funciona" })).toHaveAttribute("href", "/como-funciona");
    // Botão do Hero como aprovado na R32 (pergunta P1 da N2a com o dono); o encerramento usa o CTA sem preço.
    expect(screen.getByRole("link", { name: "Criar conta grátis" })).toHaveAttribute("href", "/criar-conta");
    expect(screen.getAllByRole("link", { name: "Começar com o squad" })[0]).toHaveAttribute("href", "/criar-conta");
    expect(screen.getByRole("link", { name: "Entenda como funciona" })).toHaveAttribute("href", "/como-funciona");
    expect(screen.getByRole("link", { name: "Otto" })).toHaveAttribute("href", "/squad/otto");
    const compare = screen.getByRole("table", { name: /Mais do que ferramentas/ });
    expect(within(compare).getAllByRole("rowheader")).toHaveLength(6);
    expect(within(compare).getAllByText("Faz").length).toBeGreaterThanOrEqual(6);
    expect(document.querySelectorAll("details")).toHaveLength(6);
    expect(screen.getByRole("link", { name: "Ver todas as perguntas" })).toHaveAttribute("href", "/faq");
    expect(ldTypes()).toEqual(["Organization", "WebSite", "SoftwareApplication"]);
  });

  it("en: mesma página com o catálogo en e as rotas en", async () => {
    await renderServer(<Landing locale="en" />);
    expect(screen.getByRole("link", { name: "See how it works" })).toHaveAttribute("href", "/en/how-it-works");
    expect(screen.getByRole("link", { name: "See all questions" })).toHaveAttribute("href", "/en/faq");
    // Nem os rótulos ocultos do botão do DS ("Carregando", "Pronto") ficam em português no HTML en.
    expect(document.body.textContent).not.toMatch(/você|não|Começar|Carregando|Pronto/);
  });
});
