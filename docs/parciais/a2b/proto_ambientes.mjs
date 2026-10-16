// A2b · capturas do protótipo V4.6 (8010, "Conta em uso") para o lado a lado de cada ambiente; o lado "nosso" vem das
// capturas do make e2e (build de produção, E2E_SCREENSHOTS). Uso (a partir de apps/web):
//   node ../../docs/parciais/a2b/proto_ambientes.mjs
import { chromium } from "/home/vitao/projetos/hellosquad/node_modules/.pnpm/playwright@1.64.1/node_modules/playwright/index.mjs";
import path from "node:path";

const dir = path.dirname(new URL(import.meta.url).pathname);
const PROTO = "http://127.0.0.1:8010/product-ui/ProductUIV4.dc.html";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: "pt-BR" });
const p = await ctx.newPage();
const wait = (ms) => p.waitForTimeout(ms);
const snap = (name) => p.screenshot({ path: `${dir}/proto-${name}.png` });
const go = async (label) => {
  await p.locator("nav.sb a, nav.sb button").filter({ hasText: label }).first().click();
  await wait(1500);
};
const tryStep = async (name, fn) => {
  try {
    await fn();
  } catch (e) {
    console.log("falhou", name, String(e).slice(0, 160));
  }
};

await p.goto(PROTO, { waitUntil: "networkidle" });
await wait(1500);
await p.click("button.ps-demo");
await wait(500);
await p.locator(".ps-guide-seg button", { hasText: "Conta em uso" }).first().click();
await wait(900);
await p.keyboard.press("Escape");
await wait(400);

await tryStep("bia", async () => {
  await go(/Estratégia/);
  await snap("a2b-bia-ambiente");
  await p.getByText("Plano de marketing", { exact: false }).last().click();
  await wait(1500);
  await snap("a2b-bia-documento");
});
await tryStep("otto", async () => {
  await go(/Conteúdo/);
  await snap("a2b-otto-calendario");
  await p.locator(".ct-it, .ct-post, [class*='ct-ev']").first().click();
  await wait(1200);
  await snap("a2b-otto-post");
});
await tryStep("kiwi", async () => {
  await go(/Growth/);
  await snap("a2b-kiwi-growth");
});
await tryStep("max", async () => {
  await go(/CRM/);
  await snap("a2b-max-importacao");
});
await tryStep("iris", async () => {
  await go(/Resultados/);
  await snap("a2b-iris-resultados");
});
await tryStep("lista", async () => {
  await go(/Minha Equipe/);
  await p.getByRole("tab", { name: /Conversas/ }).first().click();
  await wait(900);
  await snap("a2b-ambiente-lista");
});
await b.close();
console.log("ok");
