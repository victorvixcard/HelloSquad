// A2d (P-09 a P-13) · lado a lado do indicador e do documento revisável. Só navega, abre painéis e captura.
// No nosso lado, abrir a conversa do indicador cria (ou reabre) a conversa do objeto `metric`, como a tela faz; nada é
// enviado e nenhuma decisão é tomada. Uso: node cap_objeto_doc.mjs <proto|nosso> <indicador|doc|lista> [url do doc]
// Saídas: docs/parciais/a2d/<lado>-<tela>.png
import { createRequire } from "node:module";
const require = createRequire("/home/vitao/projetos/hellosquad/apps/web/package.json");
const { chromium } = require("@playwright/test");
const side = process.argv[2] || "proto";
const what = process.argv[3] || "indicador";
const docUrl = process.argv[4] || "";
const dir = "/home/vitao/projetos/hellosquad/docs/parciais/a2d";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: "pt-BR" });
const p = await ctx.newPage();
const wait = (ms) => p.waitForTimeout(ms);
const shot = (n) => p.screenshot({ path: `${dir}/${side}-${n}.png` });

if (side === "proto") {
  await p.goto("http://127.0.0.1:8010/product-ui/ProductUIV4.dc.html", { waitUntil: "networkidle" }); await wait(1500);
  await p.click("button.ps-demo"); await wait(500);
  await p.locator(".ps-guide-seg button", { hasText: "Conta em uso" }).first().click(); await wait(900);
  await p.keyboard.press("Escape"); await wait(400);
} else {
  await p.goto("http://127.0.0.1:3100/entrar", { waitUntil: "networkidle" });
  await p.getByLabel("Seu e-mail").fill("marina@miolo.example");
  await p.getByLabel("Sua senha").fill("Senha!Teste123");
  await p.getByRole("button", { name: "Entrar" }).click();
  await p.waitForURL(/\/app\/miolo/, { timeout: 40000 });
}

if (what === "lista") {
  // Nosso: os trabalhos em documento da Miolo (links "/trabalho/") nas páginas dos especialistas.
  for (const a of ["nexo", "bia"]) {
    await p.goto(`http://127.0.0.1:3100/app/miolo/squad/${a}`, { waitUntil: "networkidle" }); await wait(1500);
    const links = await p.evaluate(() => [...document.querySelectorAll("a[href]")].filter((e) => /trabalho|diagn/i.test(e.getAttribute("href") + e.innerText)).map((e) => e.getAttribute("href") + " | " + (e.innerText || "").replace(/\s+/g, " ").slice(0, 80)));
    console.log(a, JSON.stringify([...new Set(links)].slice(0, 8)));
  }
} else if (what === "indicador") {
  if (side === "proto") { await p.locator("nav.sb a, nav.sb button").filter({ hasText: /Resultados/ }).first().click(); await wait(1500); }
  else { await p.goto("http://127.0.0.1:3100/app/miolo/squad/iris", { waitUntil: "networkidle" }); await wait(3000); }
  await p.locator("main button.rs-k-ask").first().click(); await wait(side === "proto" ? 2000 : 4500);
  await shot("indicador-painel");
  await p.locator('button[aria-label="Expandir a conversa"]').first().click(); await wait(1800);
  await p.mouse.move(700, 450);
  await shot("indicador-contexto");
} else if (what === "doc") {
  if (side === "proto") {
    // V4.4 no protótipo: Estratégia → o diagnóstico da Bia (documento revisável).
    await p.locator("nav.sb a, nav.sb button").filter({ hasText: /Estratégia/ }).first().click(); await wait(1500);
    const open = p.locator("main button, main a").filter({ hasText: /diagnóstico|Ler o diagnóstico|Revisar o plano/i }).first();
    await open.click(); await wait(1800);
  } else {
    await p.goto(docUrl, { waitUntil: "networkidle" }); await wait(3000);
  }
  await shot("doc-decisao");
  console.log(await p.evaluate(() => (document.querySelector(".bd-side")?.innerText || "").slice(0, 800)));
  console.log("--crumb/h1--", await p.evaluate(() => [document.querySelector(".ps-crumb")?.innerText, document.querySelector("h1")?.innerText].join(" | ")));
}
console.log("ok", side, what);
await b.close();
