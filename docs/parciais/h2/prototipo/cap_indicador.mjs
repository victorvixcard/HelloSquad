// H2 · conversa do indicador (cartão de contexto "Indicador") nos dois lados: painel e tela cheia com a coluna
// "Contexto da conversa". No nosso lado, abrir cria (ou reabre) a conversa do objeto `metric`, como a tela faz; nada é
// enviado. Uso: node cap_indicador.mjs <proto|nosso>   Saídas: /tmp/h2_proto_shots/<lado>-ind-*.png
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/home/vitao/projetos/hellosquad/apps/web/package.json");
const { chromium } = require("@playwright/test");
const side = process.argv[2] || "proto";
const shots = "/tmp/h2_proto_shots";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: "pt-BR" });
const p = await ctx.newPage();
const wait = (ms) => p.waitForTimeout(ms);
const out = {};
const txt = (sel) => p.evaluate((sel) => (document.querySelector(sel)?.innerText || "").slice(0, 3000), sel);
if (side === "proto") {
  await p.goto("http://127.0.0.1:8010/product-ui/ProductUIV4.dc.html", { waitUntil: "networkidle" }); await wait(1500);
  await p.click("button.ps-demo"); await wait(500);
  await p.locator(".ps-guide-seg button", { hasText: "Conta em uso" }).first().click(); await wait(900);
  await p.keyboard.press("Escape"); await wait(400);
  await p.locator("nav.sb a, nav.sb button").filter({ hasText: /Resultados/ }).first().click(); await wait(1500);
} else {
  await p.goto("http://127.0.0.1:3100/entrar", { waitUntil: "networkidle" });
  await p.getByLabel("Seu e-mail").fill("marina@miolo.example");
  await p.getByLabel("Sua senha").fill("Senha!Teste123");
  await p.getByRole("button", { name: "Entrar" }).click();
  await p.waitForURL(/\/app\/miolo/, { timeout: 40000 });
  await p.goto("http://127.0.0.1:3100/app/miolo/squad/iris", { waitUntil: "networkidle" }); await wait(3000);
}
await p.locator("main button.rs-k-ask").first().click(); await wait(side === "proto" ? 2000 : 4500);
await p.screenshot({ path: `${shots}/${side}-ind-painel.png` });
out.painel = await txt("section[aria-label=Conversa], .ps-cv, aside.ps-conv, [class*=ps-cvp]");
await p.locator('button[aria-label="Expandir a conversa"]').first().click(); await wait(1500);
const rail = p.locator('button[aria-label="Mostrar o contexto"]');
if (await rail.count() && await rail.first().isVisible()) { await rail.first().click(); await wait(800); }
await p.screenshot({ path: `${shots}/${side}-ind-tela-cheia.png` });
out.cheia = await p.evaluate(() => document.body.innerText.slice(0, 6000));
fs.writeFileSync(`/tmp/h2_proto_ind_${side}.json`, JSON.stringify(out, null, 1));
console.log("ok", side);
await b.close();
