import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { signIn, snap } from "./helpers";

// SA4b: Consumo por cliente, Qualidade das entregas e Saúde das APIs. O Vic fictício vê o consumo da Miolo (alertas com
// as faixas marcadas "Proposta"), abre a Qualidade ("como ler" vindo da API), informa um saldo da Anthropic abaixo do
// limiar e vê o alerta aparecer (cartão e contador da barra) e sumir quando informa um saldo acima. A Marina (owner da
// Miolo) recebe o 403 honesto nas três telas. No fim, o saldo informado, o histórico e os eventos que o fluxo criou saem
// do banco local, e a Anthropic volta ao estado de antes (como o roteiro da SA4a).

const DB = ["exec", "supabase_db_hellosquad", "psql", "-U", "postgres", "-qtAc"];
const sql = (query: string) => execFileSync("docker", [...DB, query], { encoding: "utf8" }).trim();
const REASON = "Saldo lido no console da Anthropic (e2e SA4b)";
let started = "";
let health = "";

test.beforeAll(() => {
  started = sql("select now()::text");
  health = sql(
    "select coalesce(reported_balance::text, 'null') || '|' || coalesce(quote_literal(reported_balance_currency), 'null') || '|' || " +
      "coalesce(quote_literal(reported_balance_at::text), 'null') || '|' || coalesce(alert_below::text, 'null') from public.provider_health where provider = 'anthropic'",
  );
});

test.afterAll(() => {
  const [balance, currency, at, alert] = health.split("|");
  if (![balance, alert].every((v) => v === "null" || /^[0-9.]+$/.test(v ?? ""))) throw new Error("estado da Anthropic inesperado");
  sql(
    "begin; set local session_replication_role = replica; " +
      `delete from public.provider_balance_reports where provider = 'anthropic' and created_at >= '${started}'; ` +
      `delete from public.audit_events where action = 'admin.provider_balance_reported' and created_at >= '${started}'; ` +
      `update public.provider_health set reported_balance = ${balance}, reported_balance_currency = ${currency}, reported_balance_at = ${at}, alert_below = ${alert} where provider = 'anthropic'; commit;`,
  );
});

async function enter(page: Page, path: string, email: string) {
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(`/entrar\\?next=${encodeURIComponent(path).replace(/[?]/g, "\\?")}`));
  await signIn(page, email);
}

async function informBalance(page: Page, amount: string, alertBelow: string) {
  const card = page.getByRole("region", { name: "Anthropic" });
  await card.getByRole("button", { name: "Informar saldo" }).click();
  const dialog = page.getByRole("dialog", { name: "Informar saldo de Anthropic" });
  await dialog.getByLabel("Saldo").fill(amount);
  await dialog.getByLabel("Alertar abaixo de").fill(alertBelow);
  await dialog.getByLabel("Motivo").fill(REASON);
  await dialog.getByRole("button", { name: "Registrar saldo" }).click();
  await expect(dialog).toHaveCount(0);
  return card;
}

test("o Vic vê o consumo da Miolo, informa um saldo e vê o alerta mudar", async ({ page }) => {
  const miolo = sql("select id from public.workspaces where slug = 'miolo'");
  await enter(page, "/admin/consumo", "vic@hellosquad.example");

  // Consumo por cliente: as três faixas marcadas "Proposta", a Miolo na tabela, o item ativo na barra.
  await expect(page.getByRole("heading", { level: 1, name: "Consumo por cliente" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Consumo por cliente/ })).toHaveAttribute("aria-current", "page");
  for (const card of ["IA por crédito", "Margem bruta estimada", "Tendência do custo por turno"]) {
    await expect(page.getByRole("region", { name: card }).getByText("Proposta")).toBeVisible();
  }
  await expect(page.getByRole("region", { name: "Margem bruta estimada" }).getByText("Provisória")).toBeVisible();
  await page.goto(`/admin/consumo?conta=${miolo}`);
  const table = page.getByRole("table", { name: "Consumo por cliente, Últimos 30 dias" });
  await expect(table.getByRole("link", { name: "Miolo" })).toHaveAttribute("href", `/admin/contas/${miolo}`);
  await expect(table.getByRole("link")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Conta: Miolo" })).toBeVisible();
  await snap(page, "sa4b-consumo-miolo");

  // Qualidade: o "como ler" vem do catálogo da API no idioma da tela.
  await page.goto("/admin/qualidade");
  await expect(page.getByRole("heading", { level: 1, name: "Qualidade das entregas" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Como ler" }).getByText("Aprovada de primeira")).toBeVisible();
  await expect(page.getByRole("region", { name: "Comparar dois meses" })).toBeVisible();
  await snap(page, "sa4b-qualidade");

  // Saúde: chave só como "Ausente", sem saldo informado e sem contador na barra.
  await page.goto("/admin/saude");
  await expect(page.getByRole("heading", { level: 1, name: "Saúde das APIs" })).toBeVisible();
  const anthropic = page.getByRole("region", { name: "Anthropic" });
  await expect(anthropic.getByText("Ausente")).toBeVisible();
  await expect(anthropic.getByText("Sem saldo informado", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Saúde das APIs", exact: true })).toBeVisible();
  expect(await page.content()).not.toMatch(/sb_secret|sk-ant-|ASAAS_|MP_ACCESS|service_role/);

  // Saldo abaixo do limiar: o cartão avisa, o histórico guarda o motivo e a barra ganha o contador.
  await informBalance(page, "38,00", "50");
  await expect(page.getByRole("status").filter({ hasText: "Saldo de Anthropic registrado." })).toBeVisible();
  await expect(anthropic.getByText("Saldo abaixo do alerta")).toBeVisible();
  await expect(anthropic.getByRole("table", { name: "Saldos informados de Anthropic" }).getByText(REASON)).toBeVisible();
  await expect(page.getByRole("link", { name: "Saúde das APIs, 1 saldo abaixo do alerta" })).toBeVisible();
  await snap(page, "sa4b-saude-abaixo");

  // Saldo acima: o alerta muda e o contador some; nada mais mudou sozinho.
  await informBalance(page, "80", "50");
  await expect(anthropic.getByText("Acima do alerta")).toBeVisible();
  await expect(page.getByRole("link", { name: "Saúde das APIs", exact: true })).toBeVisible();
  await snap(page, "sa4b-saude-acima");

  const events = sql(
    `select count(*) from public.audit_events where action = 'admin.provider_balance_reported' and created_at >= '${started}'`,
  );
  expect(events).toBe("2");
});

test("a Marina (owner, sem papel de plataforma) recebe o 403 honesto no Consumo, na Qualidade e na Saúde", async ({ page }) => {
  await enter(page, "/admin/consumo", "marina@miolo.example");
  await expect(page.getByRole("heading", { level: 1, name: "Este painel é só do Super Admin da plataforma" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegação do Super Admin" })).toHaveCount(0);
  for (const path of ["/admin/qualidade", "/admin/saude"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: "Este painel é só do Super Admin da plataforma" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Informar saldo" })).toHaveCount(0);
  }
  await snap(page, "sa4b-403-marina");
});
