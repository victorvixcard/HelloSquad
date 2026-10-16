import { expect, test, type Page } from "@playwright/test";
import { signIn, snap } from "./helpers";

// A2b (Otto): o pedido "Preparar o calendário editorial" do catálogo "O que pedir ao Otto" vira o trabalho da 04.02;
// o worker simulado do e2e entrega a v1 (fixture `04.02/otto.produce.json`, posts de 19 a 23/10/2026) e os posts
// nascem no calendário como proposta ("aguarda você"). A Marina (owner) abre um post (o inspetor), aprova a v1 pelo
// trabalho e, de volta ao Conteúdo, a pauta aparece aprovada ("Aprovado"; nada é publicado, publicação é Fase 3).
// O e2e roda em 16/10/2026: a pauta é da semana seguinte, alcançada por "Próxima semana".

const REQUEST = "Quero preparar o calendário editorial.";
const TITLE = "Quero preparar o calendário editorial";
const CONTENT = "/app/miolo/squad/otto";

async function enterAsMarina(page: Page, path: string) {
  await page.goto(`/entrar?next=${encodeURIComponent(path)}`);
  await signIn(page, "marina@miolo.example");
  await page.waitForURL((url) => url.pathname === path, { timeout: 30_000 });
}

test.describe("Conteúdo · Otto (A2b)", () => {
  test("Preparar o calendário editorial vira a pauta proposta no calendário, aprovada pela Marina", async ({ page }) => {
    test.setTimeout(120_000);
    await enterAsMarina(page, CONTENT);
    await expect(page.getByRole("heading", { level: 1, name: "Conteúdo" })).toBeVisible();

    // O catálogo do cabeçalho abre a conversa do pedido com o texto já no campo.
    await page.locator("button.cap-trig").and(page.getByRole("button", { name: "Ver o que dá para pedir ao Otto" })).click();
    await page.getByRole("dialog").getByRole("button", { name: "Preparar o calendário editorial" }).click();
    const panel = page.getByRole("region", { name: "Conversa" });
    const field = panel.getByRole("textbox", { name: "Mensagem para o Otto…" });
    await expect(field).toBeVisible();
    await expect(field).toHaveValue(REQUEST);
    await field.press("Enter");

    await expect(panel.locator(".ps-msg-u .ps-bub").filter({ hasText: REQUEST })).toBeVisible();
    // Sem período no pedido, o squad pergunta antes de produzir (triagem da 04.02, fixture `briefing_incompleto`); a
    // resposta da Marina na mesma conversa é o `answered` da pergunta e o Otto segue.
    await expect(panel.getByText("Para o Otto montar o calendário: para qual semana ou período?")).toBeVisible({ timeout: 30_000 });
    await field.fill("Da próxima semana, de 19 a 25 de outubro.");
    await field.press("Enter");
    const card = panel.locator(".ps-mat").filter({ hasText: "Material · v1" });
    await expect(card).toBeVisible({ timeout: 30_000 });

    // A pauta proposta entra no calendário: a página relê a janela ao voltar ao Conteúdo.
    await page.goto(CONTENT);
    const cal = page.locator("section.ct-cal");
    await expect(cal.locator(".ct-key")).toContainText("aguarda você");
    await cal.getByRole("button", { name: "Próxima semana" }).click();
    await expect(cal.locator(".ct-rg")).toHaveText("19 a 25 out");
    const post = cal.getByRole("button", { name: /^Fornada de segunda, seg, 19\/10, 9h, Post, v1 aguarda a sua aprovação\. Selecionar$/ });
    await expect(post).toBeVisible();
    await expect(post.getByText("Aguarda você")).toBeVisible();
    await expect(cal.getByRole("button", { name: /^Bastidores da fermentação longa, qua, 21\/10, 18h, Reels/ })).toBeVisible();
    await expect(cal.getByRole("button", { name: /^Encomendas do fim de semana, sex, 23\/10, 8h, Status/ })).toBeVisible();
    await snap(page, "a2b-otto-calendario");

    // O inspetor do post: estado, data, quem, origem e a conversa sobre o conteúdo.
    await post.click();
    const ins = cal.getByRole("region", { name: "Detalhe: Fornada de segunda" });
    await expect(ins).toBeVisible();
    await expect(ins.getByText("V1 aguarda a sua aprovação")).toBeVisible();
    await expect(ins.getByText("seg, 19/10, 9h · Instagram · Post")).toBeVisible();
    await expect(ins.getByText("Otto", { exact: true })).toBeVisible();
    await expect(ins.getByRole("button", { name: "Conversar com Otto sobre este conteúdo" })).toBeVisible();
    await expect(ins.getByRole("link", { name: "Abrir entrega" })).toHaveAttribute("href", /\/app\/miolo\/squad\/otto\/trabalho\/[0-9a-f-]{36}$/);
    await snap(page, "a2b-otto-post");

    // A v1 pelo cartão da conversa: o documento da pauta e a aprovação (só o owner decide).
    await page.locator("button.v4-talk").click();
    const panel2 = page.getByRole("region", { name: "Conversa" });
    const card2 = panel2.locator(".ps-mat").filter({ hasText: "Material · v1" });
    const opened = await card2
      .first()
      .isVisible()
      .catch(() => false);
    if (opened) await card2.first().getByRole("button", { name: `Abrir a v1: ${TITLE}` }).click();
    else await ins.getByRole("link", { name: "Abrir entrega" }).click();
    await expect(page).toHaveURL(/\/app\/miolo\/squad\/otto\/trabalho\/[0-9a-f-]{36}$/);
    const main = page.getByRole("main");
    await expect(main.getByRole("rowheader", { name: "Fornada de segunda" })).toBeVisible();
    await main.getByRole("button", { name: "Aprovar v1" }).click();
    await expect(main.getByText("Aprovada por você").first()).toBeVisible();

    // De volta ao Conteúdo: a pauta aprovada (o gatilho do banco passa os posts a `planned`).
    await page.goto(CONTENT);
    const cal2 = page.locator("section.ct-cal");
    await cal2.getByRole("button", { name: "Lista" }).click();
    const row = cal2.getByRole("button", { name: /^Fornada de segunda, seg, 19\/10, 9h, Post, publicação não autorizada/ });
    await expect(row).toBeVisible();
    await expect(row.getByText("Aprovado")).toBeVisible();
    // Nenhum post ainda à espera (a legenda "aguarda você" do calendário continua, em minúsculas).
    await expect(cal2.getByText("Aguarda você", { exact: true })).toHaveCount(0);
  });
});
