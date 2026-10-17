// SA7b: captura do SA0 (file://, 1440×900) nas telas corrigidas, para o lado a lado com as capturas do e2e
// (`E2E_SCREENSHOTS=/tmp/sa7b/shots`, web de produção do worktree na 3200, seed). A montagem é o `lado_a_lado.py`.
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire("/home/vitao/projetos/hellosquad/apps/web/package.json");
const { chromium } = require("@playwright/test");
const SA0 = "file:///home/vitao/projetos/hellosquad/design/super-admin-proto";
const OUT = "/tmp/sa7b/sa0";
mkdirSync(OUT, { recursive: true });
const PAGES = [
  ["catalogo", "catalogo.html"],
  ["catalogo-otto", "catalogo.html", async (p) => p.getByRole("tab", { name: /^Otto/ }).click()],
  ["pagamentos", "pagamentos.html"],
  ["pagamentos-webhooks", "pagamentos.html#webhooks"],
  ["auditoria", "auditoria.html"],
  ["saude", "saude-apis.html"],
];
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
for (const [name, file, act] of PAGES) {
  await page.goto(`${SA0}/${file}`);
  await page.waitForTimeout(500);
  if (act) await act(page);
  await page.waitForTimeout(300);
  const tabs = await page.locator("[role=tab][aria-selected=true]").allInnerTexts();
  const head = await page.locator("h1").first().innerText();
  console.log(`${name}: h1=${JSON.stringify(head)} abas abertas=${JSON.stringify(tabs.map((t) => t.replace(/\s+/g, " ")))}`);
  await page.screenshot({ path: `${OUT}/sa0-${name}.png` });
}
console.log(`erros de console: ${errors.length}`);
await browser.close();
