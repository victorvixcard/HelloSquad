import { expect, test, type Page } from "@playwright/test";
import { signIn, snap } from "./helpers";

// A2b (Íris): Resultados com as séries do seed da S2b (90 dias até ontem, origem "fonte de teste", buraco de 3 dias nas
// sessões da Miolo). O pedido "Montar um relatório" do catálogo "O que pedir à Íris" vira o relatório do período
// (07.03); o worker simulado do e2e entrega a v1 e a Marina abre o documento com as seções do relatório.

const REQUEST = "Quero montar um relatório.";
const TITLE = "Quero montar um relatório";

async function enterAsMarina(page: Page, path: string) {
  await page.goto(`/entrar?next=${encodeURIComponent(path)}`);
  await signIn(page, "marina@miolo.example");
  await page.waitForURL((url) => url.pathname === path, { timeout: 30_000 });
}

test.describe("Resultados · Íris (A2b)", () => {
  test("indicadores com número e origem; Montar um relatório vira o relatório do período em documento", async ({ page }) => {
    await enterAsMarina(page, "/app/miolo/squad/iris");
    await expect(page.getByRole("heading", { level: 1, name: "Resultados" })).toBeVisible();

    // Dado real da base: três indicadores com número, o período com a comparação e a origem como está.
    const seg = page.getByRole("group", { name: "Período" });
    await expect(seg.getByRole("button", { name: "Mês" })).toHaveAttribute("aria-pressed", "true");
    const tiles = page.locator(".rs-kpis .rs-k");
    await expect(tiles).toHaveCount(3);
    await expect(tiles.locator(".rs-k-l")).toHaveText(["Pedidos", "Sessões no site", "Alcance no Instagram"]);
    for (let i = 0; i < 3; i += 1) await expect(tiles.nth(i).locator(".rs-k-v")).toHaveText(/\d/);
    await expect(page.locator(".rs-src")).toHaveText("Origem: fonte de teste");
    await expect(page.locator(".rs-per")).toContainText("comparado com");
    await expect(page.locator(".rs-cpc")).toContainText("sem dados");
    await expect(page.getByText("dados ilustrativos")).toHaveCount(0);
    // O buraco de 3 dias nas sessões cai no período anterior do Mês: dia sem dado, nunca zero.
    await expect(tiles.nth(1)).toContainText("3 dias sem dado no período anterior");
    await expect(page.getByRole("region", { name: "Pedidos" }).getByRole("button", { name: "Ver tabela" })).toBeVisible();
    await snap(page, "a2b-iris-resultados");

    // O catálogo do cabeçalho: o pedido abre a conversa com o texto já no campo.
    await page.locator("button.cap-trig").and(page.getByRole("button", { name: "Ver o que dá para pedir à Íris" })).click();
    await page.getByRole("dialog").getByRole("button", { name: "Montar um relatório" }).click();
    const panel = page.getByRole("region", { name: "Conversa" });
    const field = panel.getByRole("textbox", { name: "Mensagem para a Íris…" });
    await expect(field).toBeVisible();
    await expect(field).toHaveValue(REQUEST);
    await field.press("Enter");

    await expect(panel.locator(".ps-msg-u .ps-bub").filter({ hasText: REQUEST })).toBeVisible();
    const card = panel.locator(".ps-mat").filter({ hasText: "Material · v1" });
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.getByRole("button", { name: `Abrir a v1: ${TITLE}` }).click();
    await expect(page).toHaveURL(/\/app\/miolo\/squad\/iris\/trabalho\/[0-9a-f-]{36}$/);

    // O relatório em leitura editorial: comparação entre períodos, destaques, por canal e limitações.
    const doc = page.getByRole("main").locator("article.bd-doc");
    await expect(doc).toBeVisible();
    for (const section of ["Período e origem", "Destaques", "Comparação entre períodos", "Por canal", "Limitações"]) {
      await expect(doc.getByRole("heading", { level: 2, name: section })).toBeVisible();
    }
    await expect(doc.locator(".rs-evid").getByRole("rowheader", { name: "E1" })).toBeVisible();
    await expect(doc.locator(".rs-kind").first()).toHaveText(/^(Fato|Hipótese)$/);
    await snap(page, "a2b-iris-relatorio");
  });
});
