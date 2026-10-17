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
    // A Organization mínima entra para o `provider` do Service resolver na própria página (H2-26).
    expect(ldTypes()).toEqual(["BreadcrumbList", "Service", "Organization"]);
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

describe("Landing (R32 portada, L1)", () => {
  const vendors = /\b(instagram|facebook|meta ads|whatsapp|tiktok|google|youtube|linkedin|chatgpt|openai|anthropic|claude|gemini|hellootto|canva)\b/i;

  it("pt-BR: as seções da R32 na ordem da R32, com o texto no HTML do servidor e o JSON-LD da A2c", async () => {
    await renderServer(<Landing locale="pt-BR" />);
    expect([...document.querySelectorAll(".lp > header, .lp section, .lp > footer")].map((el) => el.id || el.className)).toEqual([
      "lp-bar", "topo", "demo", "squad", "autonomo", "memoria", "resultados", "porque", "faq", "comecar", "lp-foot",
    ]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Você cuida do seu negócio\.\s*Seu squad de IA assume o marketing\./);
    const h2 = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent!.replace(/\s+/g, " ").trim());
    for (const t of ["Do pedido à entrega.", "Seu marketing,", "Um Squad que conhece sua marca.", "Seus resultados revelam oportunidades.", "Mais do que ferramentas.", "Dúvidas antes"])
      expect(h2.some((x) => x.includes(t)), t).toBe(true);
    // Barra da R32: âncoras das seções, "Entrar" e "Criar conta grátis" (os modais viram /entrar e /criar-conta no cliente).
    const bar = screen.getByRole("navigation", { name: "Seções" });
    expect(within(bar).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["#demo", "#squad", "#autonomo", "#memoria", "#resultados"]);
    expect(screen.getAllByRole("button", { name: /Criar conta grátis/ }).length).toBeGreaterThan(0);
    expect(ldTypes()).toEqual(["Organization", "WebSite", "SoftwareApplication"]);
  });

  it("nenhum fornecedor no texto público: comparativo sem os logotipos, rotinas e roteiros com termos neutros", async () => {
    await renderServer(<Landing locale="pt-BR" />);
    expect(document.body.textContent).not.toMatch(vendors);
    expect(document.querySelectorAll("[data-brand]")).toHaveLength(0);
    expect(document.querySelectorAll(".lp-c2-logo")).toHaveLength(2);
    expect(document.body.textContent).toContain("Publicar 3x por semana nas redes sociais.");
  });

  it("en e es: a mesma R32 pelo dicionário, sem português nos títulos e na barra", async () => {
    await renderServer(<Landing locale="en" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/You run your business\.\s*Your AI squad takes over the marketing\./);
    expect(within(screen.getByRole("navigation", { name: "Sections" })).getAllByRole("link").map((a) => a.textContent)).toEqual([
      "How it works", "Specialists", "Autonomous mode", "Memory", "Results",
    ]);
    const h2 = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent!.replace(/\s+/g, " ").trim()).join(" | ");
    expect(h2).toContain("From request to delivery.");
    expect(h2).not.toMatch(/Você|Seu |pedido|ferramentas/);
    expect(document.body.textContent).not.toMatch(vendors);
  });

  it("es: título e perguntas em espanhol", async () => {
    await renderServer(<Landing locale="es" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Tú te ocupas de tu negocio\./);
    expect(document.body.textContent).toContain("¿Qué es HelloSquad?");
  });
});

