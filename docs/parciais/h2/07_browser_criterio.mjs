// H2 alvo 1 (browser) — critério da Fase 2 pela tela, em modo simulado, com a Marina (owner da Miolo) na web do dono
// (3100). Por persona: catálogo "O que pedir" -> pedido na conversa -> v1 ao vivo -> abrir -> aprovar (clique duplo).
// Depois, a jornada 2 do protótipo: "Quero uma campanha de Natal para vender mais panetones." na Sala do Squad.
// Uso: pelo 07_browser_criterio.sh (sobe o worker e confere o banco dentro da trava).
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";

const require = createRequire("/home/vitao/projetos/hellosquad/apps/web/package.json");
const { chromium, expect } = require("@playwright/test");
const BASE = "http://127.0.0.1:3100";
const OUT = "/home/vitao/projetos/hellosquad/docs/parciais/h2/browser";
mkdirSync(OUT, { recursive: true });
const result = { personas: {}, room: {}, console: [] };
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

const PERSONAS = [
  { id: "kiwi", art: "à Kiwi", name: "Kiwi", cap: "Planejar uma campanha paga", answer: "Tenho até R$ 1.500 por mês e quero mais encomendas pelo site no Natal." },
  { id: "bia", art: "à Bia", name: "Bia", cap: "Analisar meu negócio", answer: "Quero vender mais encomendas até o Natal." },
  { id: "max", art: "ao Max", name: "Max", cap: "Segmentar clientes", answer: "Quero separar quem compra todo mês de quem sumiu." },
  { id: "iris", art: "à Íris", name: "Íris", cap: "Analisar um indicador", answer: "As sessões no site do último mês." },
  { id: "nexo", art: "ao Nexo", name: "Nexo", cap: "Coordenar uma campanha", answer: "Campanha de Natal para vender mais panetones." },
];

const browser = await chromium.launch();
const context = await browser.newContext({ locale: "pt-BR", viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on("console", (m) => { if (m.type() === "error") result.console.push(m.text().slice(0, 200)); });

await page.goto(`${BASE}/entrar`);
await page.getByLabel("Seu e-mail").fill("marina@miolo.example");
await page.getByLabel("Sua senha").fill("Senha!Teste123");
await page.getByRole("button", { name: "Entrar" }).click();
await expect(page).toHaveURL(/\/app\/miolo$/, { timeout: 30_000 });
log("login ok");

for (const p of PERSONAS) {
  const r = (result.personas[p.id] = { steps: [] });
  try {
    await page.goto(`${BASE}/app/miolo/squad/${p.id}`);
    await page.locator("button.cap-trig").and(page.getByRole("button", { name: `Ver o que dá para pedir ${p.art}` })).click();
    await page.getByRole("dialog").getByRole("button", { name: p.cap }).click();
    const panel = page.getByRole("region", { name: "Conversa" });
    const field = panel.getByRole("textbox", { name: new RegExp(`^Mensagem para ${p.art.replace("à ", "a ").replace("ao ", "o ")}`) });
    await expect(field).toBeVisible({ timeout: 15_000 });
    r.request = await field.inputValue();
    await field.press("Enter");
    r.steps.push("pedido enviado");
    const card = panel.locator(".ps-mat").filter({ hasText: "Material · v1" }).last();
    let delivered = await card.isVisible({ timeout: 30_000 }).catch(() => false);
    if (!delivered) {
      await card.waitFor({ state: "visible", timeout: 25_000 }).then(() => (delivered = true)).catch(() => {});
    }
    if (!delivered) {
      const agentMsgs = await panel.locator(".ps-msg-a .ps-bub, .ps-msg .ps-bub").allInnerTexts();
      r.question = agentMsgs.slice(-1)[0]?.slice(0, 220);
      r.steps.push("sem v1 em 55 s; respondo");
      await field.fill(p.answer);
      await field.press("Enter");
      delivered = await card.waitFor({ state: "visible", timeout: 45_000 }).then(() => true).catch(() => false);
    }
    await page.screenshot({ path: `${OUT}/${p.id}-1-conversa.png` });
    if (!delivered) { r.steps.push("sem entrega"); continue; }
    r.card = (await card.innerText()).replace(/\s+/g, " ").slice(0, 200);
    await card.getByRole("button", { name: /^Abrir a v1/ }).click();
    await expect(page).toHaveURL(/\/trabalho\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    r.workId = page.url().split("/").pop();
    r.url = page.url().replace(BASE, "");
    const main = page.getByRole("main");
    const approve = main.getByRole("button", { name: /^Aprovar/ }).first();
    await expect(approve).toBeVisible({ timeout: 15_000 });
    r.approveLabel = (await approve.innerText()).trim();
    await approve.dblclick();
    await expect(main.getByText(/Aprovad[oa] por você/).first()).toBeVisible({ timeout: 15_000 });
    r.steps.push("aprovado pela tela");
    await page.screenshot({ path: `${OUT}/${p.id}-2-aprovado.png` });
  } catch (e) {
    r.error = String(e).slice(0, 300);
    await page.screenshot({ path: `${OUT}/${p.id}-erro.png` }).catch(() => {});
  }
  log(p.id, JSON.stringify(r).slice(0, 400));
}

// Jornada 2 do protótipo (FLUXOS §3.2): campanha coordenada na Sala do Squad.
try {
  await page.goto(`${BASE}/app/miolo`);
  await page.getByRole("navigation", { name: "HelloSquad" }).getByRole("link", { name: /Sala do Squad/ }).first().click();
  const room = page.getByRole("region", { name: "Conversa" });
  const field = room.getByRole("textbox").first();
  await expect(field).toBeVisible({ timeout: 15_000 });
  const ask = "Quero uma campanha de Natal para vender mais panetones.";
  await field.fill(ask);
  await field.press("Enter");
  await expect(room.locator(".ps-msg-u .ps-bub").filter({ hasText: ask }).last()).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(25_000);
  result.room.url = page.url().replace(BASE, "");
  result.room.after = (await room.locator(".ps-bub").allInnerTexts()).slice(-3).map((t) => t.replace(/\s+/g, " ").slice(0, 200));
  result.room.teamCard = await room.getByText(/Montei o squad|estratégia e conceito/).count();
  await page.screenshot({ path: `${OUT}/sala-campanha-natal.png` });
} catch (e) {
  result.room.error = String(e).slice(0, 300);
  await page.screenshot({ path: `${OUT}/sala-erro.png` }).catch(() => {});
}
log("sala", JSON.stringify(result.room).slice(0, 500));
writeFileSync(`${OUT}/resultado.json`, JSON.stringify(result, null, 2));
await browser.close();
