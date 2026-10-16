// A2d · lado do protótipo V4.6 para o projeto coordenado (H2-01): a jornada 2 na Sala do Squad até o cartão da equipe
// e o detalhe da "Campanha de Natal" (conta em uso). Só o protótipo em :8010; o nosso lado vem do e2e
// `apps/web/e2e/a2d-projeto.spec.ts` (E2E_SCREENSHOTS). Uso: node docs/parciais/a2d/cap_projeto.mjs
import { createRequire } from "node:module";
const require = createRequire("/home/vitao/projetos/hellosquad/apps/web/package.json");
const { chromium } = require("@playwright/test");

const OUT = "/home/vitao/projetos/hellosquad/docs/parciais/a2d";
const PROTO = "http://127.0.0.1:8010/product-ui/ProductUIV4.dc.html";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, locale: "pt-BR" })).newPage();
const wait = (ms) => p.waitForTimeout(ms);

await p.goto(PROTO);
await wait(2500);
// Jornada 2: o guia abre a Sala com o pedido escrito; a pessoa envia e responde ao Nexo.
await p.click("button.ps-demo");
await wait(600);
await p.locator(".ps-guide-seg button", { hasText: "Primeiro acesso" }).first().click();
await wait(900);
await p.click("button.ps-demo");
await wait(600);
const j2 = p.locator(".ps-guide *", { hasText: "2 · Campanha na Sala do Squad" }).last();
await j2.locator("xpath=ancestor-or-self::*[.//button][1]").getByRole("button", { name: "Começar" }).first().click();
await wait(1500);
await p.keyboard.press("Enter");
await wait(3500);
await p.getByRole("button", { name: "Nos dois" }).first().click();
await wait(6000);
await p.screenshot({ path: `${OUT}/proto-sala-campanha.png` });
// O cartão abre o projeto.
await p.getByRole("button", { name: "Abrir o projeto" }).first().click();
await wait(2500);
await p.screenshot({ path: `${OUT}/proto-projeto-estrategia.png` });
await b.close();
console.log("ok");
