// H0, alvo 6 (parte com sessão) — Playwright headless contra o web :3100 com sessão real da Marina.
// Não altera o banco. Rodar da raiz: node docs/parciais/h0/07_web_sessao.mjs
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const require = createRequire("/home/vitao/projetos/hellosquad/apps/web/");
const pw = await import(pathToFileURL(require.resolve("@playwright/test")));
const chromium = (pw.chromium ?? pw.default?.chromium);

const WEB = "http://127.0.0.1:3100";
const PASS = "Senha!Teste123";
const out = [];
const log = (...a) => out.push(a.join(" "));

const browser = await chromium.launch();
const ctx = await browser.newContext({ baseURL: WEB });
const page = await ctx.newPage();

// 1) Login da Marina
await page.goto("/entrar");
await page.getByLabel("Seu e-mail").fill("marina@miolo.example");
await page.getByLabel("Sua senha").fill(PASS);
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL(/\/app(\/|$)/, { timeout: 15000 });
log("1) login -> URL:", new URL(page.url()).pathname);
const header = (await page.locator("body").innerText()).split("\n").find((l) => /Miolo|Olá/.test(l)) || "";
log("   cabeçalho contém Miolo/Olá:", /Miolo|Olá/.test(header) ? "sim" : "não");

// 2) Cookie de sessão legível por JS?
const cookies = await ctx.cookies();
const auth = cookies.filter((c) => /auth-token|sb-/.test(c.name));
log("\n2) cookies de auth:", auth.map((c) => c.name).join(", ") || "(nenhum)");
for (const c of auth) log(`   ${c.name}: httpOnly=${c.httpOnly} secure=${c.secure} sameSite=${c.sameSite}`);
const jsCookie = await page.evaluate(() => document.cookie);
const tokenNames = auth.map((c) => c.name);
const visiveis = tokenNames.filter((n) => jsCookie.includes(n));
log("   visíveis em document.cookie (JS):", visiveis.join(", ") || "(nenhum)");

// 3) GET /sair não encerra a sessão
await page.goto("/sair");
log("\n3) GET /sair -> status visível:", (await page.title()).includes("Sair") ? "mostra confirmação" : page.url());
await page.goto("/app");
await page.waitForLoadState("networkidle");
log("   após /sair, /app continua logado:", /\/app/.test(page.url()) && !/\/entrar/.test(page.url()) ? "sim (sessão mantida)" : "não (deslogou!)");

// 4) /app/<slug de outro tenant> como Marina
for (const slug of ["vitta", "trilha"]) {
  const resp = await page.goto(`/app/${slug}`);
  await page.waitForLoadState("networkidle");
  const body = await page.locator("body").innerText();
  const vazou = /Vitta|Trilha|Rafael|Carla|Juliana/.test(body);
  const naoAchou = /não existe|não encontramos|não faz parte/i.test(body);
  log(`\n4) /app/${slug} -> HTTP ${resp.status()} | vazou dado do tenant? ${vazou ? "SIM" : "não"} | mostra 'não encontrado'? ${naoAchou ? "sim" : "não"}`);
}

// 5) Sessão adulterada: corrompe o access_token e carrega /app -> deve cair em /entrar?sessao=expirada
const authCookie = auth.find((c) => /auth-token/.test(c.name)) || auth[0];
if (authCookie) {
  const corrompido = authCookie.value.slice(0, -6) + "XXXXXX";
  await ctx.clearCookies();
  await ctx.addCookies([{ ...authCookie, value: corrompido }]);
  await page.goto("/app");
  await page.waitForLoadState("networkidle");
  log("\n5) sessão adulterada -> /app levou a:", new URL(page.url()).pathname + new URL(page.url()).search);
  const body = await page.locator("body").innerText();
  log("   vazou algo da Miolo com token inválido?", /Miolo|Olá, Marina/.test(body) ? "SIM" : "não");
}

console.log(out.join("\n"));
await browser.close();
