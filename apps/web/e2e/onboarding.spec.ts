import { expect, test, type Page } from "@playwright/test";
import enHome from "../messages/en/home.json";
import enShell from "../messages/en/shell.json";
import { signIn, snap } from "./helpers";

// A2a: onboarding progressivo (primeiro acesso da V4.6) e idioma por pessoa (ADR-0010), com dados reais do seed.

const NAME = "Oficina do Pedro";

test.describe("Onboarding progressivo (A2a)", () => {
  test("Pedro entra sem negócio, cria o negócio e faz o onboarding inteiro em pt-BR até o primeiro pedido ao Nexo", async ({ page }) => {
    test.setTimeout(90_000);
    const slug = `pedro-teste-${Date.now()}`;
    await page.goto("/entrar");
    await signIn(page, "pedro@semconta.example");
    await expect(page).toHaveURL(/\/app\/novo-workspace$/);
    await expect(page.getByRole("heading", { level: 1, name: "Comece pelo seu negócio." })).toBeVisible();
    await snap(page, "a2a-01-pedro-novo-negocio");

    // 1. Criar o negócio. Endereço em uso: 409 slug_taken vira mensagem em português no campo.
    await page.getByLabel("Nome do negócio").fill("Miolo");
    await expect(page.getByLabel("Endereço do seu squad")).toHaveValue("miolo");
    await page.getByRole("button", { name: "Criar e entrar" }).click();
    await expect(page.locator(".hs-tf-err")).toHaveText("Esse endereço já está em uso. Escolha outro.");
    await expect(page.getByLabel("Endereço do seu squad")).toHaveAttribute("aria-invalid", "true");
    await page.getByLabel("Nome do negócio").fill(NAME);
    await page.getByLabel("Endereço do seu squad").fill(slug);
    await page.getByRole("button", { name: "Criar e entrar" }).click();
    await expect(page).toHaveURL(new RegExp(`/app/${slug}$`));
    await expect(page.getByRole("button", { name: `Conta, negócio e configurações. Pedro, ${NAME}` })).toBeVisible();
    await expect(page.getByText("Hello, Pedro.")).toBeVisible();

    // 2. Primeiro acesso: o cartão da V4.6 com o progresso real (nada lido, nada conectado, nenhum objetivo).
    const card = page.getByRole("article", { name: `Para o squad conhecer ${NAME}` });
    await expect(card).toBeVisible();
    await expect(card.getByText("0 de 3")).toBeVisible();
    await expect(page.locator(".hm-res")).toHaveCount(0);
    await snap(page, "a2a-02-pedro-primeiro-acesso");

    // Saída honesta: ler o site ainda não existe; o produto diz isso, não finge leitura.
    await card.getByRole("button", { name: "Ler o site" }).click();
    await expect(page.getByText("Ainda não disponível nesta versão.")).toBeVisible();
    await expect(card.getByText("0 de 3")).toBeVisible();

    // 3. Conte o resto ao Nexo: tela cheia, as escolhas de objetivo; a escolhida vira mensagem e vai para a Memória.
    await card.getByRole("button", { name: "Conversar" }).click();
    const panel = page.getByRole("region", { name: "Conversa" });
    const choices = panel.getByRole("group", { name: `Para começar: qual é o objetivo mais importante de ${NAME} agora?` });
    await expect(choices).toBeVisible();
    await snap(page, "a2a-03-pedro-objetivo");
    await choices.getByRole("button", { name: "Vender mais encomendas" }).click();
    await expect(panel.getByText("Vender mais encomendas.", { exact: true })).toBeVisible();
    await expect(page.getByText("Anotado na Memória da Marca: “Vender mais encomendas”.")).toBeVisible();
    await expect(choices).toHaveCount(0);

    // 4. Primeiro pedido ao Nexo, na mesma conversa: a mensagem fica gravada (volta do GET depois de recarregar).
    const request = "Quero divulgar a revisão de bicicletas deste mês.";
    const field = panel.getByRole("textbox", { name: "Mensagem para o Nexo…" });
    await field.fill(request);
    await field.press("Enter");
    await expect(panel.getByText(request, { exact: true })).toBeVisible();
    await snap(page, "a2a-04-pedro-primeiro-pedido");

    // 5. O Início mostra o passo feito (1 de 3) e o objetivo; a Memória da Marca tem o objetivo confirmado.
    await page.reload();
    await expect(card.getByText("1 de 3")).toBeVisible();
    await expect(card.getByText("Objetivo: Vender mais encomendas")).toBeVisible();
    await expect(card.getByRole("button", { name: "Conversar" })).toHaveCount(0);
    await snap(page, "a2a-05-pedro-um-de-tres");
    await page.getByRole("link", { name: /^Memória da Marca/ }).click();
    await expect(page).toHaveURL(new RegExp(`/app/${slug}/memoria-da-marca$`));
    await expect(page.getByText("Vender mais encomendas").first()).toBeVisible();

    // A conversa com o Nexo guardou as duas mensagens da pessoa (lidas da API, depois de navegar).
    await page.goto(`/app/${slug}/squad/nexo`);
    await page.locator("button.v4-talk").click();
    const again = page.getByRole("region", { name: "Conversa" });
    await expect(again.getByText("Vender mais encomendas.", { exact: true })).toBeVisible();
    await expect(again.getByText(request, { exact: true })).toBeVisible();
  });

  test("Marina (conta configurada) não vê o onboarding: o Início mostra Resultados no vazio honesto", async ({ page }) => {
    await page.goto("/entrar");
    await signIn(page, "marina@miolo.example");
    await expect(page).toHaveURL(/\/app\/miolo$/);
    await expect(page.getByText("Hello, Marina.")).toBeVisible();
    await expect(page.locator("#h-onb")).toHaveCount(0);
    const res = page.getByRole("article", { name: "Resultados" });
    await expect(res).toContainText("A Íris ainda não tem números para ler");
    await expect(res.getByRole("link", { name: "Abrir Resultados" })).toHaveAttribute("href", "/app/miolo/squad/iris");
  });
});

/** Rótulo do botão de idioma no catálogo en ("{language}, …"). */
const enOption = (language: string) => enShell.account.languageOption.replace("{language}", language);

async function accountMenu(page: Page) {
  await page.locator("button.sb-me").click();
  return page.locator(".sb-pop-acct");
}

/** Deixa a Marina em pt-BR (rodada anterior que tenha caído no meio não contamina as outras). */
async function backToPortuguese(page: Page) {
  if ((await page.locator("html").getAttribute("lang")) === "pt-BR") return;
  const menu = await accountMenu(page);
  await menu.locator('button[lang="pt-BR"]').click();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
}

test.describe("Idioma por pessoa (A2a, ADR-0010)", () => {
  test("Marina troca para en, vê a casca traduzida (também depois de recarregar) e volta para pt-BR", async ({ page }) => {
    await page.goto("/entrar");
    await signIn(page, "marina@miolo.example");
    await expect(page).toHaveURL(/\/app\/miolo$/);
    await backToPortuguese(page);
    try {
      await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
      const menu = await accountMenu(page);
      await expect(menu.getByRole("group", { name: "Idioma" })).toBeVisible();
      await menu.getByRole("button", { name: "English, idioma da tela" }).click();

      // A casca inteira em inglês, pelo catálogo en: html lang, barra lateral, Início e o próprio menu.
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      const nav = page.getByRole("navigation", { name: enShell.navLabel });
      await expect(nav.getByRole("link", { name: enShell.items.home, exact: true })).toBeVisible();
      await expect(nav.getByRole("link", { name: new RegExp(`^${enShell.items.mem}`) })).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(enHome.question);
      await expect(page.getByRole("button", { name: enOption("English") })).toHaveAttribute("aria-pressed", "true");
      await snap(page, "a2a-06-marina-en");

      // A escolha fica na conta: recarregar (sessão nova no servidor) continua em inglês.
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(enHome.question);

      // E volta.
      const again = await accountMenu(page);
      await again.getByRole("button", { name: enOption("Português (Brasil)") }).click();
      await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Com o que vamos trabalhar hoje?");
      await expect(page.getByRole("navigation", { name: "HelloSquad" }).getByRole("link", { name: "Início", exact: true })).toBeVisible();
    } finally {
      await backToPortuguese(page);
    }
  });

  test("site público em /en e /es com hreflang para as três versões", async ({ page }) => {
    for (const [path, lang] of [
      ["/", "pt-BR"],
      ["/en", "en"],
      ["/es", "es"],
    ] as const) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      const alternates = await page
        .locator('link[rel="alternate"][hreflang]')
        .evaluateAll((els) => els.map((e) => `${e.getAttribute("hreflang")} ${new URL(e.getAttribute("href") ?? "").pathname}`));
      expect(alternates.sort()).toEqual(["en /en", "es /es", "pt-BR /", "x-default /"]);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path === "/" ? "/$" : `${path}$`}`));
    }
  });
});
