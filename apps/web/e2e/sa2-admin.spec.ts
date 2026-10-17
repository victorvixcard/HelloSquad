import { expect, test, type Page } from "@playwright/test";
import { signIn, snap } from "./helpers";

// SA2: o painel do Super Admin (/admin) na mesma aplicação. O Vic fictício (platform_admins do seed) entra e vê as
// sete telas com os dados do seed; a Marina (owner da Miolo, sem papel de plataforma) recebe o 403 honesto; sem sessão,
// o painel manda para o login e volta para ele. Só leitura: nenhuma ação do painel grava nada além do acesso do
// suporte que a API registra ao abrir uma conta.

async function enterAdmin(page: Page, email: string) {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/entrar\?next=%2Fadmin/);
  await signIn(page, email);
}

test("sem sessão, /admin leva ao login e o painel não entra em buscador", async ({ page, request }) => {
  const res = await request.get("/admin/contas", { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers()["location"]).toContain("/entrar?next=%2Fadmin%2Fcontas");
  expect(res.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  await page.goto("/admin/catalogo");
  await expect(page).toHaveURL(/\/entrar\?next=%2Fadmin%2Fcatalogo/);
});

test("o Vic fictício entra no /admin e vê as sete telas com os dados do seed", async ({ page }) => {
  await enterAdmin(page, "vic@hellosquad.example");

  // Contas (o painel abre em Contas), com a casca: etiqueta, dois grupos, faixa de 2FA, menu da pessoa.
  await expect(page).toHaveURL(/\/admin\/contas$/);
  await expect(page.getByRole("heading", { level: 1, name: "Contas" })).toBeVisible();
  const sidebar = page.getByRole("navigation", { name: "Navegação do Super Admin" });
  await expect(sidebar.getByText("Super Admin", { exact: true })).toBeVisible();
  await expect(sidebar.getByRole("group", { name: "Operação" })).toBeVisible();
  await expect(sidebar.getByRole("group", { name: "Squad IA" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Verificação em duas etapas desligada/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu de Vic" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const accounts = page.getByRole("table", { name: "Todas as contas" });
  for (const name of ["Miolo", "Trilha Urbana", "Vitta Estética"]) await expect(accounts.getByRole("link", { name: `Abrir a conta ${name}` })).toBeVisible();
  await snap(page, "sa2-contas");

  // Detalhe da conta: membros, extrato, assinatura; ações da SA6 desabilitadas.
  await accounts.getByRole("link", { name: "Abrir a conta Miolo" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Miolo" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Membros" })).toContainText("marina@miolo.example");
  await expect(page.getByRole("table", { name: "Extrato de créditos" })).toContainText("Créditos do ciclo");
  await expect(page.getByRole("button", { name: "Entrar no ambiente" })).toBeDisabled();
  await snap(page, "sa2-conta");

  // Catálogo: 46 deliveries, nada à venda, preço provisório e profundidade inferida marcados.
  await sidebar.getByRole("link", { name: "Catálogo" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Catálogo" })).toBeVisible();
  await expect(page.locator(".sa-met").filter({ hasText: "Deliveries" })).toContainText("46");
  await expect(page.locator(".sa-met").filter({ hasText: "À venda" })).toContainText("0");
  await expect(page.getByRole("checkbox", { name: /^À venda: Qualificar pedido/ })).toHaveAttribute("aria-checked", "false");
  await expect(page.getByText("Inferida").first()).toBeVisible();
  await snap(page, "sa2-catalogo");

  // Planos e recargas: tudo provisório e fora de venda.
  await sidebar.getByRole("link", { name: "Planos e recargas" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Squad" })).toBeVisible();
  await expect(page.getByText("R$ 99,00")).toBeVisible();
  await expect(page.getByText("Fora de venda").first()).toBeVisible();
  await snap(page, "sa2-planos");

  // Pagamentos: Asaas e Mercado Pago com a conta não criada; chave só como estado.
  await sidebar.getByRole("link", { name: "Pagamentos" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Pagamentos" })).toBeVisible();
  await expect(page.getByText("Conta não criada")).toHaveCount(2);
  await expect(page.getByRole("table", { name: "Assinaturas" })).toContainText("Miolo");
  await expect(page.locator("body")).not.toContainText(/sb_secret|eyJ|ASAAS_|MP_ACCESS/);
  await snap(page, "sa2-pagamentos");

  // Auditoria: o acesso do suporte à Miolo, registrado pela API ao abrir a conta, filtrado por Super Admin.
  await sidebar.getByRole("link", { name: "Auditoria" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Auditoria" })).toBeVisible();
  await page.getByRole("navigation", { name: "Quem" }).getByRole("link", { name: "Super Admin" }).click();
  await expect(page).toHaveURL(/quem=platform_admin/);
  await expect(page.getByRole("table", { name: "Eventos" })).toContainText("support.account_viewed");
  await snap(page, "sa2-auditoria");

  // Fila de trabalhos: o run do seed aguardando aprovação; abrir o run mostra passos e eventos.
  await sidebar.getByRole("link", { name: "Fila de trabalhos" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Fila de trabalhos" })).toBeVisible();
  const runs = page.getByRole("table", { name: "Runs" });
  await expect(runs).toContainText("Legenda do post de sábado");
  await expect(runs).toContainText("0 de 3");
  await snap(page, "sa2-fila");
  await runs.getByRole("link", { name: /^Abrir o run / }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: /^Run / })).toBeVisible();
  await expect(page.getByRole("table", { name: "Passos" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Eventos" })).toBeVisible();

  // Modelos e custos: três abas, preços provisórios conferidos em 16/10 e o câmbio de exemplo.
  await sidebar.getByRole("link", { name: "Modelos e custos" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Modelos e custos" })).toBeVisible();
  await page.getByRole("tab", { name: "Regras por tarefa" }).click();
  await expect(page.getByRole("table", { name: "Modelo e esforço por etapa" })).toContainText("claude-haiku-4-5");
  await page.getByRole("tab", { name: "Preços e câmbio" }).click();
  await expect(page).toHaveURL(/#precos$/);
  await expect(page.getByText("Conferido em 16/10/2026")).toBeVisible();
  await expect(page.getByRole("table", { name: /Preço por modelo/ })).toContainText("Opus 5.5");
  await snap(page, "sa2-modelos");
});

test("a Marina (owner, sem papel de plataforma) recebe o 403 honesto, sem a casca do painel", async ({ page }) => {
  await enterAdmin(page, "marina@miolo.example");
  await expect(page.getByRole("heading", { level: 1, name: "Este painel é só do Super Admin da plataforma" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegação do Super Admin" })).toHaveCount(0);
  await expect(page.getByText("Miolo")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ir para o HelloSquad" })).toHaveAttribute("href", "/app");
  await snap(page, "sa2-403-marina");
  await page.goto("/admin/auditoria");
  await expect(page.getByRole("heading", { level: 1, name: "Este painel é só do Super Admin da plataforma" })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});
