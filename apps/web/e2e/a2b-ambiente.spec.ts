import { expect, test, type Page } from "@playwright/test";
import { signIn, snap } from "./helpers";

// A2b · H1-04: "Conversar com <Nome>" em cada ambiente abre a conversa do ambiente (V4.6 L10572, `_openCtx('env')`):
// uma por ambiente, separada da direta, com a primeira fala do agente e as sugestões do ambiente (API da S2a,
// `context_type: environment`), e listada em Minha Equipe & Conversas como "<Nome> · <Ambiente> · sobre o ambiente".

async function enterAsMarina(page: Page, path: string) {
  await page.goto(`/entrar?next=${encodeURIComponent(path)}`);
  await signIn(page, "marina@miolo.example");
  await page.waitForURL((url) => url.pathname === path, { timeout: 30_000 });
}

test.describe("Conversa do ambiente (A2b, H1-04)", () => {
  test("Estratégia: Conversar com Bia abre a conversa do ambiente, com a primeira fala e as sugestões", async ({ page }) => {
    await enterAsMarina(page, "/app/miolo/squad/bia");
    await page.locator("button.v4-talk").click();
    const panel = page.getByRole("region", { name: "Conversa" });
    await expect(panel.locator(".cx-sub-k")).toHaveText("Conversando sobre");
    await expect(panel.locator(".cx-sub-n")).toHaveText("Estratégia");
    // Primeira fala do ambiente (calculada pela API agora) e as sugestões "Pergunte à Bia".
    await expect(panel.locator(".ps-msg-t").first()).toContainText("Oi, eu sou a Bia.", { timeout: 15_000 });
    const sug = panel.getByRole("group", { name: "Pergunte à Bia" });
    await expect(sug.getByRole("button")).toHaveCount(3);
    await snap(page, "a2b-ambiente-bia");

    // A pessoa escolhe uma sugestão e envia: a mensagem entra na conversa do ambiente e as sugestões somem.
    const first = (await sug.getByRole("button").first().textContent())?.trim() ?? "";
    await sug.getByRole("button").first().click();
    const field = panel.getByRole("textbox", { name: "Mensagem para a Bia…" });
    await expect(field).toHaveValue(first);
    await field.press("Enter");
    await expect(panel.locator(".ps-msg-u .ps-bub").filter({ hasText: first })).toBeVisible();
    await expect(panel.getByRole("group", { name: "Pergunte à Bia" })).toHaveCount(0);

    // Fechar e reabrir volta à mesma conversa (uma por ambiente), com o histórico.
    await panel.getByRole("button", { name: "Fechar a conversa" }).click();
    await page.locator("button.v4-talk").click();
    await expect(panel.locator(".ps-msg-u .ps-bub").filter({ hasText: first })).toHaveCount(1, { timeout: 15_000 });

    // Na lista de conversas, ela aparece como conversa do ambiente, separada da direta.
    await page.goto("/app/miolo/equipe");
    await page.getByRole("tab", { name: /^Conversas/ }).click();
    const row = page.locator("button.ps-ch").filter({ hasText: "Bia · Estratégia · sobre o ambiente" });
    await expect(row).toHaveCount(1);
    await expect(row.locator("b")).toHaveText("Estratégia");
    await snap(page, "a2b-ambiente-lista");
    await row.click();
    const full = page.getByRole("region", { name: "Conversa" });
    await expect(full.locator(".cx-sub-n")).toHaveText("Estratégia");
    await expect(full.getByRole("complementary", { name: "Contexto da conversa" })).toContainText("Ambiente");
  });

  test("Conteúdo: a conversa do ambiente do Otto é outra, não a conversa direta do seed", async ({ page }) => {
    await enterAsMarina(page, "/app/miolo/squad/otto");
    await page.locator("button.v4-talk").click();
    const panel = page.getByRole("region", { name: "Conversa" });
    await expect(panel.locator(".cx-sub-n")).toHaveText("Conteúdo");
    // Sem pauta no calendário do seed, o Otto diz isso (V4.6 `_cxEnvFirst`); nenhuma mensagem da conversa direta aparece.
    await expect(panel.locator(".ps-msg-t").first()).toContainText("calendário", { timeout: 15_000 });
    await expect(panel.locator(".ps-msg-u")).toHaveCount(0);
    await expect(panel.getByRole("group", { name: "Pergunte ao Otto" })).toBeVisible();
    await snap(page, "a2b-ambiente-otto");
  });
});
