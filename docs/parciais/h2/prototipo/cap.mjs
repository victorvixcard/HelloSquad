// H2 · comparação das telas da A2b com o protótipo V4.6 (auxiliar do Hulk). Só navega, abre painéis e captura.
// Nenhum botão de decisão, nenhum envio de mensagem, nenhuma importação. Única escrita possível no nosso lado:
// abrir "Conversar com Bia" cria (ou reabre) a conversa do ambiente, como a própria tela faz (A2b §3 item 2).
// Uso: node cap.mjs <proto|nosso> <uso|primeiro> [rótulo] [--conversa]
// Saídas: /tmp/h2_proto_shots/<lado>-<cenário><rótulo>-<tela>.png e /tmp/h2_proto_<lado>_<cenário><rótulo>.json
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/home/vitao/projetos/hellosquad/apps/web/package.json");
const { chromium } = require("@playwright/test");

const side = process.argv[2] || "proto";
const scen = process.argv[3] || "uso";
const tag = process.argv[4] && !process.argv[4].startsWith("--") ? process.argv[4] : "";
const withTalk = process.argv.includes("--conversa");
const shots = "/tmp/h2_proto_shots";
fs.mkdirSync(shots, { recursive: true });
const PROTO = "http://127.0.0.1:8010/product-ui/ProductUIV4.dc.html";
const WEB = "http://127.0.0.1:3100";

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: "pt-BR" });
const p = await ctx.newPage();
const errors = [];
const posts = [];
p.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 200)));
p.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 200)); });
p.on("request", (r) => { if (side === "nosso" && !["GET", "HEAD"].includes(r.method())) posts.push(r.method() + " " + r.url().slice(0, 140)); });
const out = {};
const wait = (ms) => p.waitForTimeout(ms);

const dump = (rootSel) => p.evaluate((rootSel) => {
  const root = (rootSel && document.querySelector(rootSel)) || document.querySelector(".ps-main") || document.querySelector("main") || document.body;
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  const q = (sel) => [...root.querySelectorAll(sel)].filter(vis);
  const t = (e) => (e.innerText || "").replace(/\s+/g, " ").trim().slice(0, 110);
  return {
    heads: q("h1,h2,h3,h4,h5").map(t),
    buttons: q("button,a,[role=tab],[role=switch]").map((e) => (e.getAttribute("aria-label") ? "[" + e.getAttribute("aria-label") + "] " : "") + t(e)),
    regions: q("[aria-label]").filter((e) => !["BUTTON", "A"].includes(e.tagName)).map((e) => e.tagName.toLowerCase() + ":" + e.getAttribute("aria-label")),
    inputs: q("input,textarea,select").map((e) => (e.getAttribute("aria-label") || "") + " | " + (e.getAttribute("placeholder") || "")),
    text: (root.innerText || "").slice(0, 12000),
  };
}, rootSel);

const name = (n) => `${shots}/${side}-${scen}${tag}-${n}.png`;
const snap = async (n, rootSel, full = false) => {
  await p.screenshot({ path: name(n), fullPage: full });
  out[n] = await dump(rootSel).catch((e) => ({ err: String(e) }));
};
// a área principal rola dentro de um contêiner: captura também a tela rolada em passos
const snapScroll = async (n) => {
  const sc = await p.evaluate(() => {
    const cands = [...document.querySelectorAll("main, .ps-main, .ps-body, .ps-scroll, [class*=scroll]")];
    const el = cands.find((e) => e.scrollHeight > e.clientHeight + 40 && getComputedStyle(e).overflowY !== "visible");
    if (!el) return 0;
    el.setAttribute("data-h2-scroll", "1");
    return Math.ceil(el.scrollHeight / el.clientHeight);
  });
  for (let i = 1; i < Math.min(sc, 6); i++) {
    await p.evaluate((i) => { const el = document.querySelector("[data-h2-scroll]"); el.scrollTop = el.clientHeight * i * 0.92; }, i);
    await wait(500);
    await p.screenshot({ path: name(`${n}-r${i}`) });
  }
  await p.evaluate(() => { const el = document.querySelector("[data-h2-scroll]"); if (el) { el.scrollTop = 0; el.removeAttribute("data-h2-scroll"); } });
};
const step = async (label, fn) => { try { await fn(); } catch (e) { errors.push(`passo ${label}: ${String(e).slice(0, 180)}`); } };

const envs = [["bia", /Estratégia/], ["kaia", /Marca & Criação|Marca &/], ["otto", /Conteúdo/], ["kiwi", /Growth/], ["max", /CRM/], ["iris", /Resultados/]];

let go;
if (side === "proto") {
  await p.goto(PROTO, { waitUntil: "networkidle" }); await wait(1500);
  await p.click("button.ps-demo"); await wait(500);
  await p.locator(".ps-guide-seg button", { hasText: scen === "uso" ? "Conta em uso" : "Primeiro acesso" }).first().click(); await wait(900);
  await p.keyboard.press("Escape"); await wait(400);
  go = async (k) => { const re = envs.find((e) => e[0] === k)?.[1] || k; await p.locator("nav.sb a, nav.sb button").filter({ hasText: re }).first().click(); await wait(1500); };
} else {
  const email = scen === "uso" ? "marina@miolo.example" : "juliana@trilha.example";
  const ws = scen === "uso" ? "miolo" : "trilha";
  await p.goto(`${WEB}/entrar`, { waitUntil: "networkidle" });
  await p.getByLabel("Seu e-mail").fill(email);
  await p.getByLabel("Sua senha").fill("Senha!Teste123");
  await p.getByRole("button", { name: "Entrar" }).click();
  await p.waitForURL(new RegExp(`/app/${ws}`), { timeout: 40000 });
  go = async (k) => {
    const path = k === "equipe" ? "/equipe" : `/squad/${k}`;
    await p.goto(`${WEB}/app/${ws}${path}`, { waitUntil: "networkidle", timeout: 60000 }); await wait(2500);
  };
}

for (const [k] of envs) {
  await step(k, async () => { await go(k); await snap(k); await snapScroll(k); await p.screenshot({ path: name(`${k}-full`), fullPage: true }); });
}
// catálogo da Bia (só abre e fecha)
await step("catalogo", async () => { await go("bia"); await p.locator("main button.cap-trig").first().click(); await wait(900); await snap("catalogo", "body"); await p.keyboard.press("Escape"); await wait(400); });
// Max: o que "Importar" mostra (sem enviar nada)
await step("max-importar", async () => {
  await go("max");
  const btn = p.locator("main button, main a").filter({ hasText: /^Importar/ }).first();
  if (await btn.count()) { await btn.click(); await wait(1500); await snap("max-importar", "body"); await p.keyboard.press("Escape"); await wait(400); }
  else errors.push("max-importar: sem botão Importar");
});
// Otto: inspetor do primeiro post (só leitura)
await step("otto-post", async () => {
  await go("otto");
  const it = p.locator(".ct-pw button").first();
  if (await it.count()) { await it.click(); await wait(1500); await snap("otto-post"); }
  else errors.push("otto-post: nenhum post no calendário");
});
// Bia: primeiro documento da prateleira (só leitura)
await step("bia-doc", async () => {
  await go("bia");
  const d = side === "proto" ? p.getByText("Plano de marketing", { exact: false }).last() : p.locator("main a.bi-doc").first();
  if (await d.count()) { await d.click(); await wait(3000); await snap("bia-doc"); await snapScroll("bia-doc"); }
  else errors.push("bia-doc: nenhum documento");
});
// nosso: um documento de cada outro ambiente (só leitura), quando existir
if (side === "nosso") {
  for (const [k, sel] of [["iris", "main a.v41-doc"], ["kiwi", 'main a[href*="/trabalho/"]'], ["max", 'main a[href*="/trabalho/"]']]) {
    await step(`${k}-doc`, async () => {
      await go(k);
      const d = p.locator(sel).first();
      if (await d.count()) { await d.click(); await p.waitForURL(/trabalho\//, { timeout: 20000 }); await wait(3000); await snap(`${k}-doc`); await snapScroll(`${k}-doc`); }
      else errors.push(`${k}-doc: nenhum documento`);
    });
  }
}
// Minha Equipe & Conversas, aba Conversas
await step("equipe-conversas", async () => {
  if (side === "proto") { await p.locator("nav.sb a, nav.sb button").filter({ hasText: /Minha Equipe/ }).first().click(); await wait(1500); }
  else await go("equipe");
  await p.locator("button.eq-tab, [role=tab]", { hasText: "Conversas" }).first().click(); await wait(1500); await snap("equipe-conversas");
});
// conversa do ambiente (no nosso lado, só com --conversa: cria ou reabre a conversa do ambiente)
if (side === "proto" || withTalk) {
  await step("conversa-bia", async () => {
    await go("bia");
    await p.locator('main button[aria-label^="Conversar com Bia"]').first().click(); await wait(side === "proto" ? 2000 : 4000);
    await snap("conversa-bia", "body"); await p.keyboard.press("Escape"); await wait(500);
  });
}
if (side === "proto") {
  // cartões de contexto do protótipo: indicador (Íris) e publicação (Otto)
  await step("conversa-iris", async () => {
    await go("iris");
    await p.locator("main button.rs-k-ask").first().click(); await wait(2000); await snap("conversa-iris", "body"); await p.keyboard.press("Escape"); await wait(400);
  });
  await step("conversa-otto-post", async () => {
    await go("otto");
    await p.locator(".ct-pw button").first().click(); await wait(1200);
    await p.locator('button:has-text("Conversar com Otto sobre este conteúdo")').first().click(); await wait(2000);
    await snap("conversa-otto-post", "body"); await p.keyboard.press("Escape"); await wait(400);
  });
}
fs.writeFileSync(`/tmp/h2_proto_${side}_${scen}${tag}.json`, JSON.stringify(out, null, 1));
console.log(Object.keys(out).join(" "));
console.log("escritas (nosso):", posts.length ? "\n  " + posts.join("\n  ") : "nenhuma");
console.log(errors.slice(0, 20).join("\n") || "sem erros");
await b.close();
