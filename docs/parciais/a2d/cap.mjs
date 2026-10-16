// A2d · lado a lado das correções da H2 (P-01, P-03, P-04, P-05, P-07, P-08) contra a V4.6, 1440×900, pt-BR.
// Só navega, rola e captura; não clica em nada que abra conversa, decida ou envie (os nomes acessíveis provam os botões).
// Uso: node cap.mjs <proto|nosso> [telas separadas por vírgula: iris,otto,max,kiwi]
// Saídas: docs/parciais/a2d/<lado>-<tela>.png e /tmp/a2d_<lado>.json (nomes acessíveis e textos dos cards).
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/home/vitao/projetos/hellosquad/apps/web/package.json");
const { chromium } = require("@playwright/test");

const side = process.argv[2] || "nosso";
const only = (process.argv[3] || "iris,otto,max,kiwi").split(",");
const OUT = "/home/vitao/projetos/hellosquad/docs/parciais/a2d";
const PROTO = "http://127.0.0.1:8010/product-ui/ProductUIV4.dc.html";
const WEB = "http://127.0.0.1:3100";

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: "pt-BR" });
const p = await ctx.newPage();
const errors = [];
const writes = [];
p.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 200)));
p.on("request", (r) => { if (side === "nosso" && !["GET", "HEAD"].includes(r.method())) writes.push(r.method() + " " + r.url().slice(0, 120)); });
const wait = (ms) => p.waitForTimeout(ms);
const out = { side, errors, writes };
const file = (n) => `${OUT}/${side}-${n}.png`;
const step = async (label, fn) => { try { await fn(); } catch (e) { errors.push(`${label}: ${String(e).slice(0, 200)}`); } };
// nomes acessíveis e texto de um card (a região pelo título)
const card = (title) => p.evaluate((title) => {
  const h = [...document.querySelectorAll("main h2, main h3")].find((x) => x.textContent.trim() === title);
  const sec = h && h.closest("section");
  if (!sec) return null;
  const r = sec.getBoundingClientRect();
  return {
    rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
    buttons: [...sec.querySelectorAll("button,a")].map((e) => (e.getAttribute("aria-label") ? "[" + e.getAttribute("aria-label") + "] " : "") + (e.innerText || "").replace(/\s+/g, " ").trim()),
    text: (sec.innerText || "").replace(/\s+/g, " ").trim().slice(0, 600),
  };
}, title);
const shotCard = async (title, n) => {
  const h = p.locator("main h2, main h3").filter({ hasText: new RegExp(`^${title}$`) }).first();
  const sec = h.locator("xpath=ancestor::section[1]");
  await sec.scrollIntoViewIfNeeded(); await wait(700);
  await sec.screenshot({ path: file(n) });
  out[n] = await card(title);
};

let go;
if (side === "proto") {
  await p.goto(PROTO, { waitUntil: "networkidle" }); await wait(1500);
  await p.click("button.ps-demo"); await wait(500);
  await p.locator(".ps-guide-seg button", { hasText: "Conta em uso" }).first().click(); await wait(900);
  await p.keyboard.press("Escape"); await wait(400);
  const nav = { iris: /Resultados/, otto: /Conteúdo/, max: /CRM/, kiwi: /Growth/ };
  go = async (k) => { await p.locator("nav.sb a, nav.sb button").filter({ hasText: nav[k] }).first().click(); await wait(1500); };
} else {
  await p.goto(`${WEB}/entrar`, { waitUntil: "networkidle" });
  await p.getByLabel("Seu e-mail").fill("marina@miolo.example");
  await p.getByLabel("Sua senha").fill("Senha!Teste123");
  await p.getByRole("button", { name: "Entrar" }).click();
  await p.waitForURL(/\/app\/miolo/, { timeout: 40000 });
  go = async (k) => { await p.goto(`${WEB}/app/miolo/squad/${k}`, { waitUntil: "networkidle", timeout: 60000 }); await wait(2500); };
}

if (only.includes("iris")) {
  await step("iris", async () => {
    await go("iris");
    // gráfico no período Mês (padrão nos dois lados) com as faixas rotuladas
    const ch = p.locator("main section.rs-ch").first();
    await ch.scrollIntoViewIfNeeded(); await wait(700);
    await ch.screenshot({ path: file("iris-grafico") });
    out["iris-faixas"] = await p.$$eval("main .rs-cl.is-band", (els) => els.map((e) => e.className + " = " + e.textContent + " @ " + e.getAttribute("style")));
    await shotCard("Desempenho por canal", "iris-canais");
    await shotCard("Análises recentes", "iris-analises");
    // linha de baixo inteira (Análises, Canais e o terceiro card)
    const low = p.locator("main .v41-low").first();
    await low.scrollIntoViewIfNeeded(); await wait(500);
    await low.screenshot({ path: file("iris-cards") });
    // período Semana: a faixa estreita no fim do gráfico
    await p.locator("main .rs-bar button", { hasText: "Semana" }).first().click(); await wait(900);
    await ch.scrollIntoViewIfNeeded(); await wait(500);
    await ch.screenshot({ path: file("iris-grafico-semana") });
    out["iris-faixas-semana"] = await p.$$eval("main .rs-cl.is-band", (els) => els.map((e) => e.className + " = " + e.textContent));
  });
}
if (only.includes("otto")) {
  await step("otto", async () => {
    await go("otto");
    await shotCard("Desempenho orgânico", "otto-desempenho");
    const low = p.locator("main .v41-low").first();
    await low.screenshot({ path: file("otto-cards") });
    out["otto-percebeu"] = await card("Otto percebeu");
  });
}
if (only.includes("max")) {
  await step("max", async () => {
    await go("max");
    const base = p.locator("main .mx-base").first();
    await base.screenshot({ path: file("max-consentimento") });
    out["max-rule"] = await p.evaluate(() => {
      const r = document.querySelector("main .mx-rule"), kc = document.querySelector("main .mx-kc"), kw = document.querySelector("main .mx-kw");
      const b = (e) => e && e.getBoundingClientRect();
      return r ? { rule: [b(r).x, b(r).bottom], kc: [b(kc).x, b(kc).bottom], card: [b(kw).x, b(kw).bottom] } : null;
    });
  });
}
if (only.includes("kiwi")) {
  await step("kiwi", async () => {
    await go("kiwi");
    out["kiwi-id"] = await p.$$eval("main .v4-id button, main .v4-id h1", (els) => els.map((e) => e.tagName + ": " + (e.getAttribute("aria-label") || "") + " | " + e.textContent.trim()));
    await p.locator("main .v4-id").first().screenshot({ path: file("kiwi-objeto") });
  });
}
fs.writeFileSync(`/tmp/a2d_${side}.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ errors, writes: writes.length }, null, 0));
await b.close();
