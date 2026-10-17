import { createRequire } from "node:module";
const require = createRequire("/home/vitao/projetos/hellosquad/apps/web/package.json");
const { chromium } = require("@playwright/test");
const BASE = "http://127.0.0.1:3100";
const browser = await chromium.launch();
const context = await browser.newContext({ locale: process.env.LOC || "pt-BR", viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(`${page.url()} :: ${m.text().slice(0, 600)}`); });
await page.goto(`${BASE}/entrar`);
await page.getByLabel("Seu e-mail").fill("vic@hellosquad.example");
await page.getByLabel("Sua senha").fill("Senha!Teste123");
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 30000 });
for (const r of (process.env.ROUTES || "/admin/contas").split(",")) {
  await page.goto(`${BASE}${r}`);
  await page.waitForLoadState("networkidle").catch(() => {});
  const html = await page.content();
  const re = /sb_secret_|sb_publishable_|eyJ[A-Za-z0-9_-]{20,}|ASAAS_|MP_ACCESS|ANTHROPIC_API|sk-ant-/g;
  const hits = [...html.matchAll(re)].map((m) => html.slice(Math.max(0, m.index - 70), m.index).replace(/\s+/g, " ") + " [" + m[0].slice(0, 14) + "…]");
  console.log(r, "ocorrências:", hits.length);
  for (const h of hits.slice(0, 4)) console.log("   ...", h);
  if (process.env.WORD) {
    const text = await page.locator("body").innerText();
    const i = text.indexOf(process.env.WORD);
    console.log("   palavra:", i >= 0 ? text.slice(Math.max(0, i - 80), i + 40).replace(/\s+/g, " ") : "não achei");
  }
}
console.log("erros:", errs.length);
for (const e of errs.slice(0, 3)) console.log("  ", e);
await browser.close();
