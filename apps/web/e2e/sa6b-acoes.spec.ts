import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { signIn, snap } from "./helpers";

// SA6b: ações de escrita do Super Admin pela tela. O Vic fictício abre uma sessão de suporte na Miolo e a encerra,
// ajusta o crédito e vê o saldo mudar, suspende e reativa a Trilha Urbana (com o filtro de suspensas) e reenfileira um
// run que falhou (e depois o cancela); cada ação pede motivo, mostra o resultado e aparece na auditoria da tela sem
// recarregar. A Marina (owner da Miolo) recebe o 403 honesto. No fim sai do banco local o que o fluxo criou (o run, a
// mensagem dele na fila, o e-mail ao titular, a sessão e os eventos destas ações); o teardown reaplica o seed (saldo,
// suspensão).

const DB = ["exec", "supabase_db_hellosquad", "psql", "-U", "postgres", "-qtAc"];
const sql = (query: string) => execFileSync("docker", [...DB, query], { encoding: "utf8" }).trim();
const ACTIONS = [
  "support.session_started",
  "support.session_ended",
  "credits.adjusted",
  "workspace.suspended",
  "workspace.reactivated",
  "run.requeued_by_support",
  "run.cancelled_by_support",
];
const REASON = "Conferir o erro de publicação pedido pela Marina (e2e SA6b)";
let started = "";
let run = "";

test.beforeAll(() => {
  started = sql("select now()::text");
  const miolo = sql("select id from public.workspaces where slug = 'miolo'");
  run = sql(
    "insert into public.runs (workspace_id, agent_id, status, idempotency_key, started_at, finished_at) values " +
      `('${miolo}', 'otto', 'failed', 'e2e-sa6b-' || gen_random_uuid(), now() - interval '5 minutes', now() - interval '4 minutes') returning id`,
  ).split("\n")[0]!;
});

test.afterAll(() => {
  if (!/^[0-9a-f-]{36}$/.test(run)) return;
  sql(
    "begin; set local session_replication_role = replica; " +
      `select pgmq.delete('runs_interactive', msg_id) from pgmq.q_runs_interactive where message ->> 'run_id' = '${run}'; ` +
      `delete from public.runs where id = '${run}'; ` +
      `select pgmq.delete('email_outbox', msg_id) from pgmq.q_email_outbox where enqueued_at >= '${started}' and message::text like '%support_session_started%'; ` +
      `delete from public.support_access_log where created_at >= '${started}'; ` +
      `delete from public.audit_events where created_at >= '${started}' and action in (${ACTIONS.map((a) => `'${a}'`).join(", ")}); commit;`,
  );
});

async function enter(page: Page, path: string, email: string) {
  await page.goto(path);
  await expect(page).toHaveURL(/\/entrar\?next=/);
  await signIn(page, email);
}

/** Abre o diálogo pelo botão, escreve o motivo e confirma; espera o diálogo fechar e devolve o aviso do resultado. */
async function act(page: Page, opener: ReturnType<Page["getByRole"]>, dialogName: string | RegExp, confirm: string, reason: string | null = REASON, shot?: string) {
  await opener.click();
  const dialog = page.getByRole("dialog", { name: dialogName });
  await expect(dialog).toBeVisible();
  if (reason) await dialog.getByLabel(/^Motivo/).fill(reason);
  if (shot) await snap(page, shot);
  await dialog.getByRole("button", { name: confirm, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  return page.locator(".sa-toast");
}

test("o Vic abre e encerra a sessão de suporte, ajusta crédito, suspende e reativa a Trilha e reenfileira um run", async ({ page }) => {
  const miolo = sql("select id from public.workspaces where slug = 'miolo'");
  const trilha = sql("select id from public.workspaces where slug = 'trilha'");
  await enter(page, `/admin/contas/${miolo}`, "vic@hellosquad.example");
  await expect(page.getByRole("heading", { level: 1, name: "Miolo" })).toBeVisible();
  await expect(page.getByText("Ações com motivo e auditoria")).toBeVisible();
  const head = page.locator(".sa-head-a");
  const audit = page.getByRole("table", { name: "Auditoria desta conta" });

  // Sessão de suporte: motivo e 15 min; faixa com o prazo e o tempo que falta; o titular recebe o e-mail; encerrar.
  await head.getByRole("button", { name: "Entrar no ambiente" }).click();
  const enterDialog = page.getByRole("dialog", { name: "Entrar no ambiente da Miolo" });
  await expect(enterDialog.getByRole("radio", { name: "30 min" })).toBeChecked();
  await enterDialog.getByText("15 min").click();
  await enterDialog.getByLabel("Motivo do acesso").fill(REASON);
  await snap(page, "sa6b-dialogo-entrar");
  await enterDialog.getByRole("button", { name: "Entrar com o motivo registrado" }).click();
  await expect(page.locator(".sa-toast")).toContainText("Sessão de suporte na Miolo aberta até");
  const band = page.getByRole("region", { name: "Suporte", exact: true });
  await expect(band).toContainText(/Faltam 1[45] min\./);
  await expect(band).toContainText(REASON);
  await expect(head.getByRole("button", { name: /Entrar no ambiente/ })).toBeDisabled();
  await expect(page.getByRole("table", { name: "Acessos do suporte" })).toContainText(REASON);
  await expect(audit).toContainText("support.session_started");
  expect(sql(`select count(*) from public.support_access_log where workspace_id = '${miolo}' and reason = '${REASON}' and ended_at is null`)).toBe("1");
  expect(Number(sql(`select count(*) from pgmq.q_email_outbox where enqueued_at >= '${started}' and message::text like '%support_session_started%'`))).toBeGreaterThan(0);
  await snap(page, "sa6b-sessao-ativa");
  await expect(await act(page, band.getByRole("button", { name: "Encerrar sessão" }), "Encerrar a sessão de suporte na Miolo?", "Encerrar sessão", null)).toContainText(
    "Sessão de suporte na Miolo encerrada.",
  );
  await expect(band).toHaveCount(0);
  await expect(audit).toContainText("support.session_ended");
  await expect(head.getByRole("button", { name: "Entrar no ambiente" })).toBeEnabled();

  // Ajustar crédito: +5 com motivo; o saldo do cartão muda e o ajuste entra na auditoria desta conta.
  const balance = page.locator(".sa-met").filter({ hasText: "Saldo de créditos" });
  const before = Number(sql(`select app.credit_balance('${miolo}')`));
  const br = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  await head.getByRole("button", { name: "Ajustar crédito" }).click();
  const creditDialog = page.getByRole("dialog", { name: "Ajustar crédito da Miolo" });
  await creditDialog.getByLabel("Créditos").fill("5");
  await expect(creditDialog).toContainText(`Saldo: ${br(before)} → ${br(before + 5)}`);
  await creditDialog.getByLabel("Motivo").fill("Devolver crédito da falha do run (e2e SA6b)");
  await snap(page, "sa6b-dialogo-credito");
  await creditDialog.getByRole("button", { name: "Lançar ajuste" }).click();
  await expect(page.locator(".sa-toast")).toContainText(`saldo ${br(before)} → ${br(before + 5)}`);
  await expect(balance).toContainText(br(before + 5));
  await expect(audit).toContainText("credits.adjusted");
  expect(Number(sql(`select app.credit_balance('${miolo}')`))).toBe(before + 5);
  await snap(page, "sa6b-credito");

  // Suspender e reativar a Trilha Urbana; a lista filtra as suspensas.
  await page.goto(`/admin/contas/${trilha}`);
  await expect(page.getByRole("heading", { level: 1, name: "Trilha Urbana" })).toBeVisible();
  await expect(
    await act(page, page.locator(".sa-head-a").getByRole("button", { name: "Suspender" }), "Suspender a Trilha Urbana", "Suspender conta", "Teste de suspensão pedido pelo dono (e2e SA6b)"),
  ).toContainText("Trilha Urbana suspensa.");
  await expect(page.getByRole("note").filter({ hasText: "Conta suspensa." })).toContainText("Teste de suspensão pedido pelo dono (e2e SA6b)");
  await expect(page.getByRole("table", { name: "Auditoria desta conta" })).toContainText("workspace.suspended");
  await snap(page, "sa6b-suspensa");
  await page.goto("/admin/contas?status=suspended");
  const list = page.getByRole("table", { name: "Todas as contas" });
  await expect(list.getByRole("link", { name: "Abrir a conta Trilha Urbana" })).toBeVisible();
  await expect(list.getByRole("link")).toHaveCount(1);
  await list.getByRole("link", { name: "Abrir a conta Trilha Urbana" }).click();
  await expect(
    await act(page, page.locator(".sa-head-a").getByRole("button", { name: "Reativar" }), "Reativar a Trilha Urbana", "Reativar conta", "Pagamento regularizado pelo titular (e2e SA6b)"),
  ).toContainText("Trilha Urbana reativada.");
  await expect(page.getByRole("note").filter({ hasText: "Conta suspensa." })).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Auditoria desta conta" })).toContainText("workspace.reactivated");
  expect(sql("select suspended_at is null from public.workspaces where slug = 'trilha'")).toBe("t");

  // Fila: o run que falhou volta para a fila com motivo; depois, na página do run, é cancelado.
  const short = run.slice(0, 8);
  await page.goto("/admin/fila?estado=failed");
  const row = page.getByRole("row").filter({ has: page.getByRole("link", { name: `Abrir o run ${short}` }) });
  await expect(row).toHaveCount(1);
  await expect(
    await act(page, row.getByRole("button", { name: "Reenfileirar" }), `Reenfileirar o run ${short}?`, "Reenfileirar com o motivo", "Falhou por saldo; crédito ajustado (e2e SA6b)"),
  ).toContainText(`Run ${short} de volta na fila (tentativas: 0).`);
  await expect(page.getByRole("table", { name: "Auditoria da fila" })).toContainText("run.requeued_by_support");
  expect(sql(`select status from public.runs where id = '${run}'`)).toBe("queued");
  await snap(page, "sa6b-fila");
  await page.goto(`/admin/fila/${run}`);
  await expect(
    await act(page, page.locator(".sa-head-a").getByRole("button", { name: "Cancelar" }), `Cancelar o run ${short}?`, "Cancelar o run", "Pedido em duplicidade (e2e SA6b)", "sa6b-dialogo-cancelar"),
  ).toContainText(`Run ${short} cancelado.`);
  expect(sql(`select status from public.runs where id = '${run}'`)).toBe("cancelled");
  await expect(page.locator(".sa-head-a").getByRole("button", { name: "Reenfileirar" })).toBeVisible();

  // Catálogo e planos: os diálogos de edição abrem com o valor vigente (só a captura; nada é gravado aqui).
  await page.goto("/admin/catalogo?agente=otto");
  await page.getByRole("row").filter({ hasText: "04.01" }).getByRole("button", { name: "Editar" }).click();
  await expect(page.getByRole("dialog", { name: /^04\.01 · / })).toBeVisible();
  await snap(page, "sa6b-dialogo-catalogo");
  await page.keyboard.press("Escape");
  await page.goto("/admin/planos");
  await page.getByRole("button", { name: "Editar como versão nova" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("À venda fica travado");
  await snap(page, "sa6b-dialogo-plano");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("table", { name: "Versões gravadas pelo painel" })).toBeVisible();

  // Auditoria: as sete ações com o Vic; as que pedem motivo, com o motivo.
  const vic = "(select id::text from auth.users where email = 'vic@hellosquad.example')";
  const recorded = `from public.audit_events where created_at >= '${started}' and actor_id = ${vic} and action in (${ACTIONS.map((a) => `'${a}'`).join(", ")})`;
  expect(sql(`select string_agg(distinct action, ',' order by action) ${recorded}`)).toBe([...ACTIONS].sort().join(","));
  expect(sql(`select count(*) ${recorded} and action <> 'support.session_ended' and coalesce(payload ->> 'reason', '') = ''`)).toBe("0");
});

test("a Marina (owner, sem papel de plataforma) recebe o 403 honesto nas telas de escrita", async ({ page }) => {
  const miolo = sql("select id from public.workspaces where slug = 'miolo'");
  await enter(page, `/admin/contas/${miolo}`, "marina@miolo.example");
  await expect(page.getByRole("heading", { level: 1, name: "Este painel é só do Super Admin da plataforma" })).toBeVisible();
  for (const path of [`/admin/contas/${miolo}`, "/admin/catalogo", "/admin/planos", "/admin/fila", "/admin/pagamentos"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: "Este painel é só do Super Admin da plataforma" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Entrar no ambiente|Ajustar crédito|Editar|Reenfileirar|Reprocessar/ })).toHaveCount(0);
  }
  await snap(page, "sa6b-403-marina");
});
