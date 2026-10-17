import { createRequire } from "node:module";
const require = createRequire("/home/vitao/projetos/hellosquad/apps/web/package.json");
const { chromium } = require("@playwright/test");
const BASE = process.env.BASE || "http://127.0.0.1:3100";
const browser = await chromium.launch();
for (const [email, routes] of [["vic@hellosquad.example", ["/admin/contas", "/admin/catalogo"]], ["marina@miolo.example", ["/app/miolo", "/admin/contas"]]]) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/entrar`);
  await page.getByLabel("Seu e-mail").fill(email);
  await page.getByLabel("Sua senha").fill("Senha!Teste123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 30000 });
  const cookies = await context.cookies();
  const auth = cookies.filter((c) => c.name.includes("auth-token"));
  console.log(email, "cookies de sessão:", auth.map((c) => `${c.name} httpOnly=${c.httpOnly}`).join(", "));
  for (const r of routes) {
    await page.goto(`${BASE}${r}`);
    const html = await page.content();
    const m = html.match(/base64-([A-Za-z0-9+/=_-]{40,})/);
    let keys = "-";
    if (m) {
      try { const j = JSON.parse(Buffer.from(m[1].replace(/\\.*/, ""), "base64").toString("utf8")); keys = Object.keys(j).join(","); }
      catch { keys = "(json parcial) " + Buffer.from(m[1].slice(0, 400), "base64").toString("utf8").replace(/"(eyJ|[A-Za-z0-9_-]{20,})[^"]*"/g, '"<redigido>"').slice(0, 160); }
    }
    const inDom = await page.evaluate(() => (self.__next_f || []).map((x) => String(x[1] ?? "")).join("").includes("base64-eyJ"));
    console.log(`  ${r}: sessão no HTML? ${!!m} | chaves: ${keys} | legível por JS (self.__next_f)? ${inDom}`);
  }
  await context.close();
}
await browser.close();
