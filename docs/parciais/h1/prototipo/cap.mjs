// H1 · comparação com o protótipo (Hulk). Só navega, abre painéis e captura: não decide nada.
// Uso (a partir de apps/web): node ../../docs/parciais/h1/prototipo/cap.mjs <proto|nosso> [uso|primeiro]
// Saídas: /tmp/h1_proto_shots/<lado>-<cenário>-<tela>.png e /tmp/h1_proto_<lado>_<cenário>.json
import { chromium } from "/home/vitao/projetos/hellosquad/node_modules/.pnpm/playwright@1.64.1/node_modules/playwright/index.mjs";
import fs from "node:fs";

const side = process.argv[2] || "proto";
const scen = process.argv[3] || "uso";
const shots = "/tmp/h1_proto_shots";
fs.mkdirSync(shots, { recursive: true });
const PROTO = "http://127.0.0.1:8010/product-ui/ProductUIV4.dc.html";
const WEB = "http://127.0.0.1:3100";

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: "pt-BR" });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 200)));
p.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 200)); });
const out = {};
const wait = (ms) => p.waitForTimeout(ms);

const dump = (rootSel) => p.evaluate((rootSel) => {
  const root = (rootSel && document.querySelector(rootSel)) || document.querySelector(".ps-main") || document.body;
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  const q = (sel) => [...root.querySelectorAll(sel)].filter(vis);
  const t = (e) => (e.innerText || "").replace(/\s+/g, " ").trim().slice(0, 110);
  return {
    heads: q("h1,h2,h3,h4,h5").map(t),
    buttons: q("button,a,[role=tab],[role=switch]").map((e) => (e.getAttribute("aria-label") ? "[" + e.getAttribute("aria-label") + "] " : "") + t(e)),
    regions: q("[aria-label]").filter((e) => !["BUTTON", "A"].includes(e.tagName)).map((e) => e.tagName.toLowerCase() + ":" + e.getAttribute("aria-label")),
    inputs: q("input,textarea").map((e) => (e.getAttribute("aria-label") || "") + " | " + (e.getAttribute("placeholder") || "")),
    text: (root.innerText || "").slice(0, 9000),
  };
}, rootSel);

const snap = async (name, rootSel, full = false) => {
  await p.screenshot({ path: `${shots}/${side}-${scen}-${name}.png`, fullPage: full });
  out[name] = await dump(rootSel).catch((e) => ({ err: String(e) }));
};
const scrollTo = (sel) => p.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: "start" }), sel);
const step = async (label, fn) => { try { await fn(); } catch (e) { errors.push(`passo ${label}: ${String(e).slice(0, 160)}`); } };

if (side === "proto") {
  await p.goto(PROTO, { waitUntil: "networkidle" }); await wait(1500);
  await p.click("button.ps-demo"); await wait(500);
  await p.locator(".ps-guide-seg button", { hasText: scen === "uso" ? "Conta em uso" : "Primeiro acesso" }).first().click(); await wait(900);
  await p.keyboard.press("Escape"); await wait(400);
  const nav = async (label) => { await p.locator("nav.sb a, nav.sb button").filter({ hasText: label }).first().click(); await wait(1500); };
  await step("inicio", async () => { await nav(/^Início/); await snap("inicio"); out.barra = await dump("nav.sb"); });
  await step("conta", async () => { await p.locator("button.sb-me").click(); await wait(600); await snap("conta", "body"); await p.keyboard.press("Escape"); await wait(300); });
  await step("otto", async () => { await nav(/Conteúdo/); await snap("otto"); });
  await step("conversa", async () => {
    await p.locator('main button[aria-label^="Conversar com Otto"]').first().click(); await wait(1800); await snap("conversa", "body");
    await p.keyboard.press("Escape"); await wait(500);
  });
  await step("projetos", async () => { await nav(/Projetos/); await snap("projetos"); await scrollTo("#pj-all-t"); await wait(500); await snap("projetos-quadro"); });
  await step("lista", async () => { await p.click('.wk-views button[aria-label="Lista"]'); await wait(700); await scrollTo("#pj-all-t"); await wait(300); await snap("projetos-lista"); });
  await step("biblioteca", async () => { await p.click('.wk-views button[aria-label="Biblioteca"]'); await wait(700); await scrollTo("#pj-all-t"); await wait(300); await snap("projetos-biblioteca"); await p.click('.wk-views button[aria-label="Quadro"]'); await wait(500); });
  await step("trabalho", async () => {
    await scrollTo("#pj-all-t"); await wait(300);
    await p.locator(".wk-lane.is-you .wk-card .wk-a").first().click(); await wait(1500); await snap("trabalho");
    await p.click('.ps-tabs button:has-text("Histórico")'); await wait(500); await snap("trabalho-historico");
  });
  await step("memoria", async () => { await nav(/Memória da Marca/); await snap("memoria"); await scrollTo(".me-br"); await wait(500); await snap("memoria-tudo"); });
  await step("equipe", async () => { await nav(/Minha Equipe/); await snap("equipe"); await p.locator("button.eq-tab", { hasText: "Conversas" }).click(); await wait(800); await snap("equipe-conversas"); });
  for (const [k, re] of [["bia", /Estratégia/], ["kaia", /Marca & Criação|Marca &/], ["kiwi", /Growth/], ["max", /CRM/], ["iris", /Resultados/], ["auto", /Modo Autônomo/]]) {
    await step(k, async () => { await nav(re); await snap(k, null, true); });
  }
} else {
  await p.goto(`${WEB}/entrar`, { waitUntil: "networkidle" });
  await p.getByLabel("Seu e-mail").fill("marina@miolo.example");
  await p.getByLabel("Sua senha").fill("Senha!Teste123");
  await p.getByRole("button", { name: "Entrar" }).click();
  await p.waitForURL(/\/app\/miolo/, { timeout: 30000 });
  const go = async (path) => { await p.goto(`${WEB}/app/miolo${path}`, { waitUntil: "networkidle" }); await wait(2200); };
  await step("inicio", async () => { await go(""); await snap("inicio"); out.barra = await dump("nav.sb"); });
  await step("conta", async () => { await p.locator("button.sb-me").click(); await wait(600); await snap("conta", "body"); await p.keyboard.press("Escape"); await wait(300); });
  await step("otto", async () => { await go("/squad/otto"); await snap("otto"); });
  await step("conversa", async () => {
    await p.locator('main button[aria-label^="Conversar com Otto"]').first().click(); await wait(2500); await snap("conversa", "body");
    await p.keyboard.press("Escape"); await wait(500);
  });
  await step("projetos", async () => { await go("/squad/nexo"); await snap("projetos"); await scrollTo("#pj-all-t"); await wait(500); await snap("projetos-quadro"); });
  await step("lista", async () => { await p.click('.wk-views button[aria-label="Lista"]'); await wait(700); await scrollTo("#pj-all-t"); await wait(300); await snap("projetos-lista"); });
  await step("biblioteca", async () => { await p.click('.wk-views button[aria-label="Biblioteca"]'); await wait(700); await scrollTo("#pj-all-t"); await wait(300); await snap("projetos-biblioteca"); await p.click('.wk-views button[aria-label="Quadro"]'); await wait(500); });
  await step("trabalho", async () => {
    await scrollTo("#pj-all-t"); await wait(300);
    await p.locator(".wk-lane.is-you .wk-card .wk-a").first().click(); await p.waitForURL(/trabalho\//, { timeout: 15000 }); await wait(2200); await snap("trabalho");
    await p.click('.ps-tabs button:has-text("Histórico")'); await wait(500); await snap("trabalho-historico");
  });
  await step("memoria", async () => { await go("/memoria-da-marca"); await snap("memoria"); await scrollTo(".me-br"); await wait(500); await snap("memoria-tudo"); });
  await step("equipe", async () => { await go("/equipe"); await snap("equipe"); await p.locator("button.eq-tab", { hasText: "Conversas" }).click(); await wait(1200); await snap("equipe-conversas"); });
  for (const k of ["bia", "kaia", "kiwi", "max", "iris"]) await step(k, async () => { await go(`/squad/${k}`); await snap(k, null, true); });
  await step("auto", async () => { await go("/modo-autonomo"); await snap("auto", null, true); });
}
fs.writeFileSync(`/tmp/h1_proto_${side}_${scen}.json`, JSON.stringify(out, null, 1));
console.log(Object.keys(out).join(" "));
console.log(errors.slice(0, 15).join("\n") || "sem erros");
await b.close();
