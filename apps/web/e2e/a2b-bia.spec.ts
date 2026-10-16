import { expect, test, type Page } from "@playwright/test";
import { grantLocalCredits, signIn, snap } from "./helpers";

// A2b (Bia): o pedido "Analisar meu negócio" do catálogo "O que pedir à Bia" vira o trabalho do diagnóstico (02.01),
// o worker simulado do e2e entrega a v1, a Marina (owner) lê o documento, aprova o diagnóstico e o encontra na
// prateleira "Planos e diagnósticos" de Estratégia. O título do trabalho é a primeira frase do pedido sem ponto final.

const REQUEST = "Quero analisar meu negócio.";
const TITLE = "Quero analisar meu negócio";

async function enterAsMarina(page: Page, path: string) {
  await page.goto(`/entrar?next=${encodeURIComponent(path)}`);
  await signIn(page, "marina@miolo.example");
  await page.waitForURL((url) => url.pathname === path, { timeout: 30_000 });
}

test.describe("Estratégia · Bia (A2b)", () => {
  test("Analisar meu negócio vira o diagnóstico em documento, aprovado e na prateleira", async ({ page }) => {
    grantLocalCredits("miolo", 10, "a2b-bia");
    await enterAsMarina(page, "/app/miolo/squad/bia");
    await expect(page.getByRole("heading", { level: 1, name: "Estratégia" })).toBeVisible();

    // O catálogo do cabeçalho: cada capacidade abre a conversa do pedido com o texto já no campo.
    await page.locator("button.cap-trig").and(page.getByRole("button", { name: "Ver o que dá para pedir à Bia" })).click();
    await page.getByRole("dialog").getByRole("button", { name: "Analisar meu negócio" }).click();
    const panel = page.getByRole("region", { name: "Conversa" });
    const field = panel.getByRole("textbox", { name: "Mensagem para a Bia…" });
    await expect(field).toBeVisible();
    await expect(field).toHaveValue(REQUEST);
    await field.press("Enter");

    // A mensagem aparece na hora; o worker simulado entrega a v1 com o cartão do material.
    await expect(panel.locator(".ps-msg-u .ps-bub").filter({ hasText: REQUEST })).toBeVisible();
    const card = panel.locator(".ps-mat").filter({ hasText: "Material · v1" });
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.getByRole("button", { name: `Abrir a v1: ${TITLE}` }).click();
    await expect(page).toHaveURL(/\/app\/miolo\/squad\/bia\/trabalho\/[0-9a-f-]{36}$/);
    const docUrl = new URL(page.url()).pathname;

    // O documento em leitura editorial, com as seções do diagnóstico.
    const main = page.getByRole("main");
    const doc = main.locator("article.bd-doc");
    await expect(doc).toBeVisible();
    await expect(doc.locator(".bd-k")).toHaveText("Diagnóstico");
    for (const section of ["Panorama", "Pontos de atenção", "Oportunidades"]) {
      await expect(doc.getByRole("heading", { level: 2, name: section })).toBeVisible();
    }
    await snap(page, "a2b-bia-documento");

    // Só o owner decide; aprovar não publica nada.
    await main.getByRole("button", { name: "Aprovar o diagnóstico" }).click();
    await expect(main.getByText(/^Aprovad[oa]/).first()).toBeVisible();

    // De volta a Estratégia: o diagnóstico está em "Planos e diagnósticos" e as oportunidades vêm dele.
    await page.goto("/app/miolo/squad/bia");
    const shelf = page.getByRole("region", { name: "Planos e diagnósticos" });
    await expect(shelf).toBeVisible();
    const item = shelf.locator(`a.bi-doc[href="${docUrl}"]`);
    await expect(item).toBeVisible();
    await expect(item).toHaveAccessibleName(/^Diagnóstico: .+, Aprovado\. Abrir$/);
    await expect(page.getByRole("region", { name: "Oportunidades identificadas" }).locator(".bi-o").first()).toBeVisible();
    await expect(page.getByText("A Bia ainda não conhece Miolo o bastante para propor uma direção.")).toHaveCount(0);
    await snap(page, "a2b-bia-ambiente");
  });
});
