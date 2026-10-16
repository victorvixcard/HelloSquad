// H1 alvo 1 — teste de aceite do Documento Mestre §16 pelo browser, em modo simulado.
// Marina (owner da Miolo): pedido pelo Nexo -> trabalho -> entrega do Otto ao vivo -> revisão -> aprovação
// (clique duplo) -> histórico, visível na conversa e em Projetos. O crédito é conferido pelo orquestrador
// (01_aceite.sh) no banco antes e depois. Uso: rodar pelo 01_aceite.sh (sobe o worker sob a trava do banco).
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire("/home/vitao/projetos/hellosquad/apps/web/package.json");
const { chromium, expect } = require("@playwright/test");

const BASE = "http://127.0.0.1:3100";
const OUT = process.env.H1_OUT || "/home/vitao/projetos/hellosquad/docs/parciais/h1/aceite";
const REQUEST = process.env.H1_REQUEST || "Quero uma legenda para o Instagram sobre o pão de centeio da semana.";
const result = { steps: [], errors: [], console: [] };
const step = (name, data = {}) => {
  result.steps.push({ t: new Date().toISOString().slice(11, 19), name, ...data });
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${name} ${JSON.stringify(data)}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({ locale: "pt-BR", viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") result.console.push(`${m.type()}: ${m.text().slice(0, 300)}`);
});
const wsFrames = [];
page.on("websocket", (ws) => {
  ws.on("framereceived", (f) => {
    const s = typeof f.payload === "string" ? f.payload : "";
    if (/run_event|approval|work_item/.test(s)) wsFrames.push(s.slice(0, 200));
  });
});

try {
  await page.goto(`${BASE}/entrar`);
  await page.getByLabel("Seu e-mail").fill("marina@miolo.example");
  await page.getByLabel("Sua senha").fill("Senha!Teste123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/app\/miolo$/, { timeout: 30_000 });
  const bar0 = await page.getByText(/créditos do mês/).first().innerText().catch(() => "(sem barra)");
  const needs0 = await page.getByRole("region", { name: /Precisa de você/ }).first().getAttribute("aria-label").catch(() => null);
  step("login", { bar: bar0.replace(/\s+/g, " ").slice(0, 120), needs: needs0 });
  await page.screenshot({ path: `${OUT}/01-inicio-antes.png` });

  // Pedido pelo Nexo (coordenador: 99% dos pedidos entram por ele).
  const nav = page.getByRole("navigation", { name: "HelloSquad" });
  await page.goto(`${BASE}/app/miolo/squad/nexo`);
  await page.locator("button.v4-talk").first().click();
  const panel = page.getByRole("region", { name: "Conversa" });
  const field = panel.getByRole("textbox").first();
  await expect(field).toBeVisible();
  step("painel-nexo-aberto", { placeholder: await field.getAttribute("aria-label") });
  await field.fill(REQUEST);
  await field.press("Enter");
  await expect(panel.locator(".ps-msg-u .ps-bub").filter({ hasText: REQUEST })).toBeVisible();
  step("pedido-enviado");

  // Entrega chega ao vivo, sem recarregar.
  await page.evaluate(() => (window.__h1 = 1));
  const card = panel.locator(".ps-mat").filter({ hasText: "Material · v1" }).last();
  await expect(card).toBeVisible({ timeout: 45_000 });
  await expect(card.getByText("Aguarda sua aprovação")).toBeVisible({ timeout: 15_000 });
  const noReload = await page.evaluate(() => window.__h1 === 1);
  step("entrega-v1-ao-vivo", { semRecarregar: noReload, cartao: (await card.innerText()).replace(/\s+/g, " ").slice(0, 200) });
  await page.screenshot({ path: `${OUT}/02-conversa-entrega-v1.png` });

  // Revisão: abre a versão e aprova com clique duplo (idempotência na interface).
  await card.getByRole("button", { name: /^Abrir a v1/ }).click();
  await expect(page).toHaveURL(/\/trabalho\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  const workId = page.url().split("/").pop();
  result.workItemId = workId;
  const main = page.getByRole("main");
  const approve = main.getByRole("button", { name: "Aprovar v1" });
  await expect(approve).toBeVisible();
  step("revisao-aberta", { workId });
  await page.screenshot({ path: `${OUT}/03-trabalho-revisao.png` });
  await approve.dblclick();
  await expect(main.getByText("Aprovada por você").first()).toBeVisible({ timeout: 15_000 });
  step("aprovado");
  // O painel da conversa, aberto ao lado, acompanha a decisão sem recarregar?
  const live = panel.locator(".ps-mat").filter({ hasText: "Material · v1" }).last();
  let panelOk = false;
  try {
    await expect(live.getByText("Aprovada por você")).toBeVisible({ timeout: 10_000 });
    panelOk = true;
  } catch {}
  step("painel-ao-lado-sem-recarregar", { aprovadaNoPainel: panelOk, botaoAprovarAinda: await live.getByRole("button", { name: "Aprovar v1" }).count(), texto: (await live.innerText()).replace(/\s+/g, " ").slice(-80) });
  await page.screenshot({ path: `${OUT}/04b-painel-10s-depois.png` });
  await page.screenshot({ path: `${OUT}/04-trabalho-aprovado.png`, fullPage: true });
  const mainText = (await main.innerText()).replace(/\s+/g, " ");
  const hist = mainText.match(/Histórico.{0,600}/);
  step("historico", { trecho: hist ? hist[0].slice(0, 600) : "(sem seção Histórico no texto da página)" });

  // Recarrega: o estado persiste; conversa e Projetos mostram a aprovação.
  await page.reload();
  await expect(page.getByRole("main").getByText("Aprovada por você").first()).toBeVisible({ timeout: 15_000 });
  step("persistiu-apos-recarregar");
  await page.goto(`${BASE}/app/miolo/squad/nexo`);
  await page.waitForLoadState("networkidle");
  const projText = (await page.getByRole("main").innerText()).replace(/\s+/g, " ");
  const title = REQUEST.replace(/\.$/, "");
  const idx = projText.indexOf(title.slice(0, 40));
  step("projetos", { aparece: idx >= 0, trecho: idx >= 0 ? projText.slice(Math.max(0, idx - 120), idx + 160) : projText.slice(0, 300) });
  await page.screenshot({ path: `${OUT}/05-projetos-depois.png`, fullPage: true });
  await page.locator("button.v4-talk").first().click();
  const panel2 = page.getByRole("region", { name: "Conversa" });
  const card2 = panel2.locator(".ps-mat").filter({ hasText: "Material · v1" }).last();
  await expect(card2).toBeVisible({ timeout: 15_000 });
  step("conversa-depois", { cartao: (await card2.innerText()).replace(/\s+/g, " ").slice(0, 200) });
  await page.screenshot({ path: `${OUT}/06-conversa-depois.png` });
  await page.goto(`${BASE}/app/miolo`);
  await page.waitForLoadState("networkidle");
  const bar1 = await page.getByText(/créditos do mês/).first().innerText().catch(() => "(sem barra)");
  step("barra-creditos-depois", { bar: bar1.replace(/\s+/g, " ").slice(0, 120) });
} catch (err) {
  result.errors.push(String(err).slice(0, 1500));
  console.log("ERRO", String(err).slice(0, 1500));
  await page.screenshot({ path: `${OUT}/99-erro.png`, fullPage: true }).catch(() => {});
} finally {
  result.wsFramesSample = wsFrames.slice(0, 8);
  result.wsFrames = wsFrames.length;
  writeFileSync(`${OUT}/resultado.json`, JSON.stringify(result, null, 2));
  await browser.close();
}
process.exit(result.errors.length ? 1 : 0);
