import { expect, type Page } from "@playwright/test";
import path from "node:path";

export const PASSWORD = "Senha!Teste123"; // senha só local dos usuários fictícios do seed

export async function signIn(page: Page, email: string) {
  await page.getByLabel("Seu e-mail").fill(email);
  await page.getByLabel("Sua senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
}

/** Captura para o relatório quando E2E_SCREENSHOTS aponta para uma pasta. */
export async function snap(page: Page, name: string) {
  const dir = process.env.E2E_SCREENSHOTS;
  if (!dir) return;
  await expect(page.locator("body")).toBeVisible();
  // Entradas animadas (o squad caindo no Início, a mensagem que aparece) começam com opacidade 0: o toBeVisible já
  // passa, mas a captura sairia vazia. Espera as animações finitas terminarem (as infinitas, como a faixa, não contam).
  await page
    .waitForFunction(
      () => document.getAnimations().every((a) => a.effect?.getTiming().iterations === Infinity || a.playState !== "running"),
      undefined,
      { timeout: 6_000 },
    )
    .catch(() => undefined);
  await page.screenshot({ path: path.resolve(dir, `${name}.png`) });
}
