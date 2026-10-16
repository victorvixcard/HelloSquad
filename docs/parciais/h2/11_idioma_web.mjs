// H2 alvo 8 — ordem do idioma na área logada (pessoa -> negócio -> pt-BR): Vitta em en; Carla escolheu es; Rafael sem
// idioma próprio. Lê <html lang> e um rótulo da casca. Preparo e volta pelo 11_idioma_web.sh (dentro da trava).
import { createRequire } from "node:module";
const require = createRequire("/home/vitao/projetos/hellosquad/apps/web/package.json");
const { chromium } = require("@playwright/test");
const BASE = "http://127.0.0.1:3100";
const browser = await chromium.launch();
for (const email of ["carla@vitta.example", "rafael@vitta.example"]) {
  const page = await (await browser.newContext({ locale: "pt-BR", viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(`${BASE}/entrar`);
  await page.getByLabel("Seu e-mail").fill(email);
  await page.getByLabel("Sua senha").fill("Senha!Teste123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/app\/vitta/, { timeout: 30_000 });
  await page.waitForTimeout(1000);
  const lang = await page.locator("html").getAttribute("lang");
  const nav = (await page.getByRole("navigation").first().innerText()).replace(/\s+/g, " ").slice(0, 120);
  console.log(email, "| html lang =", lang, "| barra:", nav);
}
await browser.close();
