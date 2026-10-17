import { expect, test } from "@playwright/test";
import { signIn, snap } from "./helpers";

test.describe("área logada", () => {
  test("sem sessão, /app manda para o login e volta para onde a pessoa ia", async ({ page }) => {
    await page.goto("/app/miolo/squad/bia");
    await expect(page).toHaveURL(/\/entrar\?next=%2Fapp%2Fmiolo%2Fsquad%2Fbia$/);
    await expect(page.getByRole("heading", { level: 1, name: "Bem-vindo de volta." })).toBeVisible();
    await signIn(page, "marina@miolo.example");
    await expect(page).toHaveURL(/\/app\/miolo\/squad\/bia$/);
    await expect(page.getByRole("heading", { level: 1, name: "Estratégia" })).toBeVisible();
  });

  test("senha errada mostra o erro em português e mantém o e-mail", async ({ page }) => {
    await page.goto("/entrar");
    await page.getByLabel("Seu e-mail").fill("marina@miolo.example");
    await page.getByLabel("Sua senha").fill("senha-errada");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator(".hs-form-err")).toHaveText("E-mail ou senha não conferem.");
    await expect(page.getByLabel("Seu e-mail")).toHaveValue("marina@miolo.example");
  });

  test("Marina entra e vê a barra lateral com o workspace Miolo", async ({ page }) => {
    await page.goto("/entrar");
    await snap(page, "01-entrar");
    await signIn(page, "marina@miolo.example");
    await expect(page).toHaveURL(/\/app\/miolo$/);
    // A1f: casca da V4.6 (conta no pé da barra, agente mini nos ambientes, Início V3).
    await expect(page.getByRole("button", { name: "Conta, negócio e configurações. Marina, Miolo" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Com o que vamos trabalhar hoje?");
    await expect(page.getByText("Hello, Marina.")).toBeVisible();

    const nav = page.getByRole("navigation", { name: "HelloSquad" });
    for (const group of ["Principal", "Seu squad", "Gestão"]) {
      await expect(nav.getByRole("group", { name: group })).toBeVisible();
    }
    const squad = nav.getByRole("group", { name: "Seu squad" });
    await expect(squad.getByRole("link")).toHaveCount(7);
    for (const name of [
      /^Projetos, com Nexo/,
      "Estratégia, com Bia",
      "Marca & Criação, com Kaia",
      "Conteúdo, com Otto",
      "Growth, com Kiwi",
      "CRM, com Max",
      "Resultados, com Íris",
    ]) {
      await expect(squad.getByRole("link", { name })).toBeVisible();
    }
    for (const name of [/^Início$/, /^Sala do Squad/, /^Modo Autônomo/, /^Memória da Marca$/, /^Minha Equipe & Conversas$/]) {
      await expect(nav.getByRole("link", { name })).toBeVisible();
    }
    await expect(nav.getByRole("link", { name: /^Início$/ })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("textbox", { name: "Pedido para a Sala do Squad" })).toBeEnabled();
    await snap(page, "02-marina-shell");

    await squad.getByRole("link", { name: "Growth, com Kiwi" }).click();
    await expect(page).toHaveURL(/\/app\/miolo\/squad\/kiwi$/);
    await expect(page.getByRole("heading", { level: 1, name: "Growth Marketing" })).toBeVisible();

    await page.getByRole("button", { name: "Recolher a barra lateral" }).click();
    await expect(page.getByRole("button", { name: "Expandir a barra lateral" })).toBeVisible();
    await snap(page, "03-marina-barra-recolhida");

    // A área logada não entra em buscador.
    // No build de produção, depois do login, o meta do /entrar ("noindex, follow") fica no body ao lado do da área
    // logada (metadado em streaming do Next 15): todos precisam dizer noindex.
    const robots = await page.locator('meta[name="robots"]').evaluateAll((els) => els.map((e) => e.getAttribute("content") ?? ""));
    expect(robots.length).toBeGreaterThan(0);
    for (const content of robots) expect(content).toContain("noindex");

    await page.getByRole("button", { name: /^Conta, negócio e configurações/ }).click();
    await page.getByRole("dialog", { name: "Conta, negócio e configurações" }).getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/entrar$/);
  });

  // O Pedro sem negócio (cria o negócio e faz o onboarding) ficou em onboarding.spec.ts (A2a): um caminho só, para a
  // ordem dos arquivos não importar.
});

test.describe("site público", () => {
  test("página inicial em pt-BR com SEO e crawlers de IA liberados", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Seu squad de IA assume o marketing.");
    // L1: a landing é a R32 portada; "Criar conta grátis" é o botão do DS e leva à tela real de cadastro.
    await expect(page.getByRole("button", { name: /Criar conta grátis/ }).first()).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
    // A2c: o grafo do README da N2a (§5.1), com o WebSite entre a organização e o aplicativo.
    expect(ld["@graph"].map((n: { "@type": string }) => n["@type"])).toEqual(["Organization", "WebSite", "SoftwareApplication"]);
    await snap(page, "00-pagina-inicial");

    const robots = await (await request.get("/robots.txt")).text();
    for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) expect(robots).toContain(`User-Agent: ${bot}`);
    expect(robots).toContain("Disallow: /app");
    expect((await request.get("/sitemap.xml")).status()).toBe(200);
    const llms = await request.get("/llms.txt");
    expect(llms.status()).toBe(200);
    // A2c: o llms.txt da N2a (docs/conteudo/site/llms.txt) substituiu o da A0.
    expect(await llms.text()).toContain("Kiwi, Growth Marketing");
    const app = await request.get("/app/miolo", { maxRedirects: 0 });
    expect(app.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  });
});
