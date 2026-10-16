// A1c · comparação lado a lado com o protótipo V4.6 (H1-03 e H1-04). Navega, abre a conversa, escreve "obrigada".
// Uso (a partir de apps/web): node ../../docs/parciais/a1c/lado_a_lado.mjs <proto|nosso>
// Saídas: docs/parciais/a1c/<lado>-*.png e /tmp/a1c_<lado>.json (presença das sugestões, cabeçalho, título).
import { chromium } from "/home/vitao/projetos/hellosquad/node_modules/.pnpm/playwright@1.64.1/node_modules/playwright/index.mjs";
import fs from "node:fs";
import path from "node:path";

const side = process.argv[2] || "proto";
const dir = path.dirname(new URL(import.meta.url).pathname);
const PROTO = "http://127.0.0.1:8010/product-ui/ProductUIV4.dc.html";
const WEB = "http://127.0.0.1:3100";

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: "pt-BR" });
const p = await ctx.newPage();
const out = { side, errors: [] };
p.on("pageerror", (e) => out.errors.push("pageerror: " + e.message.slice(0, 200)));
const wait = (ms) => p.waitForTimeout(ms);
const state = async () =>
  p.evaluate(() => {
    const conv = document.querySelector(".ps-conv:not(.is-off)");
    const sug = conv?.querySelector(".cx-sug");
    return {
      head: conv?.querySelector(".ps-cvh-n")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      sugestoes: sug ? [...sug.querySelectorAll(".cx-sg")].map((e) => e.textContent.trim()) : [],
      ultimas: [...(conv?.querySelectorAll(".ps-msg-u .ps-bub, .ps-msg .ps-msg-t") ?? [])].slice(-3).map((e) => e.textContent.trim().slice(0, 80)),
    };
  });
const snap = async (name) => {
  await p.screenshot({ path: `${dir}/${side}-${name}.png` });
  out[name] = await state();
};
const send = async (text) => {
  const field = p.locator(".ps-conv:not(.is-off) textarea, .ps-conv:not(.is-off) input[type=text]").first();
  await field.click();
  await field.fill(text);
  await field.press("Enter");
};

if (side === "proto") {
  await p.goto(PROTO, { waitUntil: "networkidle" });
  await wait(1500);
  await p.click("button.ps-demo");
  await wait(500);
  await p.locator(".ps-guide-seg button", { hasText: "Conta em uso" }).first().click();
  await wait(900);
  await p.keyboard.press("Escape");
  await wait(400);
  await p.locator("nav.sb a, nav.sb button").filter({ hasText: /Conteúdo/ }).first().click();
  await wait(1500);
  // H1-04: "Conversar com Otto" no ambiente abre a conversa do ambiente (objeto `env`, L10572).
  await p.locator('main button[aria-label^="Conversar com Otto"]').first().click();
  await wait(1800);
  await snap("1-conversa-do-ambiente");
  // H1-03: a pessoa escreve algo que não vira pedido; as sugestões somem (L10912).
  await send("obrigada");
  await wait(2600);
  await snap("2-depois-da-mensagem");
} else {
  await p.goto(`${WEB}/entrar`, { waitUntil: "networkidle" });
  await p.getByLabel("Seu e-mail").fill("marina@miolo.example");
  await p.getByLabel("Sua senha").fill("Senha!Teste123");
  await p.getByRole("button", { name: "Entrar" }).click();
  await p.waitForURL(/\/app\/miolo/, { timeout: 30000 });
  await p.goto(`${WEB}/app/miolo/squad/otto`, { waitUntil: "networkidle" });
  await wait(2200);
  // H1-04 (pendente, ver relatório): hoje abre a conversa direta do seed com o cartão do ambiente.
  await p.locator('main button[aria-label^="Conversar com Otto"]').first().click();
  await wait(2500);
  await snap("1-conversa-do-ambiente");
  await p.keyboard.press("Escape");
  await wait(500);
  // H1-03: conversa nova com o Otto (a pessoa ainda não escreveu) e a primeira mensagem dela.
  await p.goto(`${WEB}/app/miolo/equipe`, { waitUntil: "networkidle" });
  await wait(1500);
  await p.getByRole("tab", { name: /Conversas/ }).click();
  await wait(600);
  await p.getByRole("button", { name: "Otto", exact: true }).click();
  await wait(400);
  await p.getByRole("button", { name: "Nova conversa com o Otto" }).click();
  await wait(1500);
  await snap("2-antes-da-mensagem");
  await send("obrigada");
  await wait(2600);
  await snap("3-depois-da-mensagem");
}
fs.writeFileSync(`/tmp/a1c_${side}.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await b.close();
