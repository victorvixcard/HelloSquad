import { expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
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

/**
 * Bônus local de créditos para um fluxo que pede entrega (A2b), pelo papel privilegiado do banco local, como o roteiro
 * da S2a (`app.grant_credits`, origem `bonus`). Só o container `supabase_db_hellosquad`; o teardown reaplica o seed e
 * o saldo volta ao do seed. Sem ele, os fluxos que rodam depois dos outros esgotariam os créditos fictícios da Miolo.
 */
export function grantLocalCredits(slug: string, amount: number, label: string) {
  if (!/^[a-z0-9-]+$/.test(slug) || !/^[a-z0-9-]+$/.test(label)) throw new Error("slug ou rótulo inválido");
  const sql =
    `select remaining from app.grant_credits((select id from public.workspaces where slug = '${slug}'), ${Number(amount)}, ` +
    `'bonus', 'e2e:${label}:${Date.now()}', p_note => 'e2e local da A2b')`;
  execFileSync("docker", ["exec", "supabase_db_hellosquad", "psql", "-U", "postgres", "-qtAc", sql], { stdio: "pipe" });
}
