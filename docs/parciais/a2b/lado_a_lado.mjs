// A2b · capturas para a comparação lado a lado com a V4.6 (partes do Aranha principal: conversa do ambiente, catálogo
// "O que pedir" e o estúdio da Kaia). Uso (a partir de apps/web): node ../../docs/parciais/a2b/lado_a_lado.mjs <proto|nosso>
// Saídas: docs/parciais/a2b/<lado>-*.png. O "nosso" usa o next dev da 3100 com a Marina do seed.
import { chromium } from "/home/vitao/projetos/hellosquad/node_modules/.pnpm/playwright@1.64.1/node_modules/playwright/index.mjs";
import path from "node:path";

const side = process.argv[2] || "proto";
const dir = path.dirname(new URL(import.meta.url).pathname);
const PROTO = "http://127.0.0.1:8010/product-ui/ProductUIV4.dc.html";
const WEB = "http://127.0.0.1:3100";

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: "pt-BR" });
const p = await ctx.newPage();
const wait = (ms) => p.waitForTimeout(ms);
const snap = (name) => p.screenshot({ path: `${dir}/${side}-${name}.png` });

if (side === "proto") {
  await p.goto(PROTO, { waitUntil: "networkidle" });
  await wait(1500);
  await p.click("button.ps-demo");
  await wait(500);
  await p.locator(".ps-guide-seg button", { hasText: "Conta em uso" }).first().click();
  await wait(900);
  await p.keyboard.press("Escape");
  await wait(400);
  await p.locator("nav.sb a, nav.sb button").filter({ hasText: /Estratégia/ }).first().click();
  await wait(1500);
  await p.locator("main button.cap-trig").first().click();
  await wait(900);
  await snap("1-catalogo-bia");
  await p.keyboard.press("Escape");
  await wait(400);
  await p.locator('main button[aria-label^="Conversar com Bia"]').first().click();
  await wait(2000);
  await snap("2-conversa-do-ambiente-bia");
  await p.keyboard.press("Escape");
  await wait(400);
  await p.locator("nav.sb a, nav.sb button").filter({ hasText: /Marca/ }).first().click();
  await wait(1500);
  await snap("3-kaia");
} else {
  await p.goto(`${WEB}/entrar`, { waitUntil: "networkidle" });
  await p.getByLabel("Seu e-mail").fill("marina@miolo.example");
  await p.getByLabel("Sua senha").fill("Senha!Teste123");
  await p.getByRole("button", { name: "Entrar" }).click();
  await p.waitForURL(/\/app\/miolo/, { timeout: 30000 });
  await p.goto(`${WEB}/app/miolo/squad/bia`, { waitUntil: "networkidle" });
  await wait(2500);
  await p.locator("main button.cap-trig").first().click();
  await wait(900);
  await snap("1-catalogo-bia");
  await p.keyboard.press("Escape");
  await wait(400);
  await p.locator("main button.v4-talk").first().click();
  await wait(3500);
  await snap("2-conversa-do-ambiente-bia");
  await p.keyboard.press("Escape");
  await wait(400);
  await p.goto(`${WEB}/app/miolo/squad/kaia`, { waitUntil: "networkidle" });
  await wait(2500);
  await snap("3-kaia");
}
await b.close();
console.log("ok", side);
