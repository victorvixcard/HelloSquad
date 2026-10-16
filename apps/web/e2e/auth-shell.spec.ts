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
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robots).toContain("noindex");

    await page.getByRole("button", { name: /^Conta, negócio e configurações/ }).click();
    await page.getByRole("dialog", { name: "Conta, negócio e configurações" }).getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/entrar$/);
  });

  test("Pedro entra sem workspace, cria pedro-teste-<timestamp> e cai no shell dele", async ({ page }) => {
    const slug = `pedro-teste-${Date.now()}`;
    await page.goto("/entrar");
    await signIn(page, "pedro@semconta.example");
    await expect(page).toHaveURL(/\/app\/novo-workspace$/);
    await expect(page.getByRole("heading", { level: 1, name: "Comece pelo seu negócio." })).toBeVisible();
    await snap(page, "04-pedro-novo-workspace");

    // Endereço em uso: 409 slug_taken vira mensagem em português no campo.
    await page.getByLabel("Nome do negócio").fill("Miolo");
    await expect(page.getByLabel("Endereço do seu squad")).toHaveValue("miolo");
    await page.getByRole("button", { name: "Criar e entrar" }).click();
    await expect(page.locator(".hs-tf-err")).toHaveText("Esse endereço já está em uso. Escolha outro.");
    await expect(page.getByLabel("Endereço do seu squad")).toHaveAttribute("aria-invalid", "true");
    await snap(page, "05-pedro-endereco-em-uso");

    await page.getByLabel("Nome do negócio").fill("Pedro Teste");
    await page.getByLabel("Endereço do seu squad").fill(slug);
    await page.getByRole("button", { name: "Criar e entrar" }).click();
    await expect(page).toHaveURL(new RegExp(`/app/${slug}$`));
    await expect(page.getByRole("button", { name: /^Conta, negócio e configurações\. Pedro, Pedro Teste$/ })).toBeVisible();
    await expect(page.getByText("Hello, Pedro.")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "HelloSquad" })).toBeVisible();
    await snap(page, "06-pedro-shell");
  });
});

test.describe("site público", () => {
  test("página inicial em pt-BR com SEO e crawlers de IA liberados", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Seu squad de IA assume o marketing.");
    await expect(page.getByRole("link", { name: "Criar conta grátis" }).first()).toHaveAttribute("href", "/criar-conta");
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
    expect(ld["@graph"].map((n: { "@type": string }) => n["@type"])).toEqual(["Organization", "SoftwareApplication"]);
    await snap(page, "00-pagina-inicial");

    const robots = await (await request.get("/robots.txt")).text();
    for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) expect(robots).toContain(`User-Agent: ${bot}`);
    expect(robots).toContain("Disallow: /app");
    expect((await request.get("/sitemap.xml")).status()).toBe(200);
    const llms = await request.get("/llms.txt");
    expect(llms.status()).toBe(200);
    expect(await llms.text()).toContain("Kiwi (Growth Marketing)");
    const app = await request.get("/app/miolo", { maxRedirects: 0 });
    expect(app.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  });
});
