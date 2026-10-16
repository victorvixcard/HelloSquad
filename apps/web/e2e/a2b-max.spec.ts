import { expect, test } from "@playwright/test";
import path from "node:path";
import { signIn, snap } from "./helpers";

// A2b · CRM · Max: a Marina (owner da Miolo) vê a base do seed (20 contatos, 10 com consentimento), importa um CSV
// fictício com três linhas (uma válida com consentimento, uma sem consentimento e uma duplicada de um contato do seed)
// e vê o relatório: 1 contato importado e as duas linhas recusadas com número e motivo. O total vira 21.
// Roda no banco do seed; o teardown reaplica o seed.

const CSV = path.resolve(__dirname, "fixtures/contatos-a2b.csv");
const PATH = "/app/miolo/squad/max";

test.describe("CRM · Max com a base real (A2b)", () => {
  test("importa uma planilha CSV e mostra as linhas recusadas, sem dado pessoal", async ({ page }) => {
    await page.goto(`/entrar?next=${encodeURIComponent(PATH)}`);
    await signIn(page, "marina@miolo.example");
    await page.waitForURL((url) => url.pathname === PATH, { timeout: 30_000 });

    await expect(page.getByRole("heading", { level: 1, name: "CRM" })).toBeVisible();
    const base = page.getByRole("region", { name: "Visão da base" });
    await expect(base.getByText("Aceitam receber mensagens: 10 de 20 contatos")).toBeVisible();
    await expect(base.getByText("Nada é enviado sem consentimento e sem a sua autorização.")).toBeVisible();

    await page.getByRole("button", { name: "Importar a planilha de clientes" }).click();
    const form = page.getByRole("form", { name: "Importar uma planilha CSV" });
    await form.getByLabel("Arquivo CSV").setInputFiles(CSV);
    await form.getByLabel("Origem dos dados").fill("Planilha de teste da A2b");
    await form.getByRole("button", { name: "Importar" }).click();

    await expect(page.getByRole("status").filter({ hasText: "contato importado" })).toHaveText("1 contato importado, 2 linhas recusadas");
    const refused = page.getByRole("list", { name: "Linhas recusadas" });
    await expect(refused.getByRole("listitem")).toHaveText(["Linha 3 · sem consentimento", "Linha 4 · contato já está na base"]);
    // Nada da linha recusada aparece na tela.
    await expect(page.getByText("rui.a2b@contatos.example")).toHaveCount(0);

    // router.refresh(): o resumo da API já conta o contato novo.
    await expect(base.getByText("Aceitam receber mensagens: 11 de 21 contatos")).toBeVisible({ timeout: 15_000 });
    await expect(base.locator(".mx-kp").first().locator("b")).toHaveText("21");
    await expect(base.getByText("Planilha de teste da A2b")).toBeVisible();
    await snap(page, "a2b-max-importacao");
  });
});
