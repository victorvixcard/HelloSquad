// H-SA alvo 7 (e o 1 pela tela) — web /admin na 3100 do dono. Marina (owner), Carla (editora), Pedro (sem negócio) e
// sem sessão nas 16 telas do painel: só a página 403 honesta, nenhum dado de conta; o Vic: 200, noindex (meta e
// X-Robots-Tag), faixa de 2FA, nenhum segredo no HTML, capturas a 1440; idioma do Vic em en e es pelo user_metadata
// (restaurado pelo .sh). Uso: bash docs/parciais/hsa/06_web_admin.sh
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";

const require = createRequire("/home/vitao/projetos/hellosquad/apps/web/package.json");
const { chromium } = require("@playwright/test");
const BASE = "http://127.0.0.1:3100";
const OUT = "/home/vitao/projetos/hellosquad/docs/parciais/hsa/web";
mkdirSync(OUT, { recursive: true });
const MIOLO = "6bcdc5bd-3c9a-4a7a-bb83-22b2ba88edc2";
const RUN = process.env.RUN_ID;
const ROUTES = ["/admin", "/admin/contas", `/admin/contas/${MIOLO}`, "/admin/catalogo", "/admin/planos", "/admin/pagamentos",
  "/admin/auditoria", "/admin/fila", `/admin/fila/${RUN}`, "/admin/modelos", "/admin/squad", "/admin/squad/otto", "/admin/regras",
  "/admin/consumo", "/admin/saude", "/admin/qualidade"];
const SECRET = /sb_secret_|sb_publishable_|eyJ[A-Za-z0-9_-]{20,}|ASAAS_|MP_ACCESS|ANTHROPIC_API|sk-ant-/;
const result = { personas: {}, vic: {}, anon: {}, i18n: {}, console: [] };
const log = (...a) => console.log(...a);

async function login(context, email) {
  const page = await context.newPage();
  page.on("console", (m) => { if (m.type() === "error") result.console.push(`${email}: ${m.text().slice(0, 160)}`); });
  await page.goto(`${BASE}/entrar`);
  await page.getByLabel("Seu e-mail").fill(email);
  await page.getByLabel("Sua senha").fill("Senha!Teste123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 30_000 });
  return page;
}

const browser = await chromium.launch();
const FULL = process.env.I18N_STEP === "none";
for (const [email, markers] of (FULL ? [
  ["marina@miolo.example", ["Vitta Estética", "Trilha Urbana", "vic@hellosquad.example", "Textos e legendas de marketing"]],
  ["carla@vitta.example", ["Trilha Urbana", "Miolo", "vic@hellosquad.example", "Textos e legendas de marketing"]],
  ["pedro@semconta.example", ["Trilha Urbana", "Miolo", "Vitta Estética", "Textos e legendas de marketing"]],
] : [])) {
  const context = await browser.newContext({ locale: "pt-BR", viewport: { width: 1440, height: 900 } });
  const page = await login(context, email);
  const rows = [];
  for (const r of ROUTES) {
    const resp = await page.goto(`${BASE}${r}`);
    const html = await page.content();
    const text = await page.locator("body").innerText();
    rows.push({ route: r, status: resp.status(), url: new URL(page.url()).pathname, forbidden: text.includes("Este painel é só do Super Admin da plataforma"),
      leaks: markers.filter((m) => text.includes(m) || html.includes(m)), noindex: /<meta name="robots" content="noindex/.test(html) });
  }
  await page.screenshot({ path: `${OUT}/403-${email.split("@")[0]}.png` });
  result.personas[email] = rows;
  const bad = rows.filter((x) => !x.forbidden || x.leaks.length);
  log(`${email}: ${rows.length} telas; 403 honesto em ${rows.filter((x) => x.forbidden).length}; status ${[...new Set(rows.map((x) => x.status))]}; vazamentos ${JSON.stringify(bad.map((x) => [x.route, x.leaks]))}`);
  await context.close();
}

if (FULL) {
  const context = await browser.newContext({ locale: "pt-BR" });
  const page = await context.newPage();
  const rows = [];
  for (const r of ROUTES) {
    const resp = await page.goto(`${BASE}${r}`);
    const text = await page.locator("body").innerText();
    rows.push({ route: r, status: resp.status(), url: new URL(page.url()).pathname, data: ["Miolo", "Vitta Estética", "Trilha Urbana"].filter((m) => text.includes(m)) });
  }
  result.anon = rows;
  log(`sem sessão: destinos ${JSON.stringify([...new Set(rows.map((x) => x.url))])}; dado de conta visível em ${rows.filter((x) => x.data.length).length}`);
  await context.close();
}

if (FULL) {
  const context = await browser.newContext({ locale: "pt-BR", viewport: { width: 1440, height: 900 } });
  const page = await login(context, "vic@hellosquad.example");
  const rows = [];
  for (const r of ROUTES) {
    const resp = await page.goto(`${BASE}${r}`);
    await page.waitForLoadState("networkidle").catch(() => {});
    const html = await page.content();
    const text = await page.locator("body").innerText();
    const name = r === "/admin" ? "inicio" : r.replace("/admin/", "").replaceAll("/", "-").replace(MIOLO, "miolo").replace(RUN ?? "x", "run");
    await page.screenshot({ path: `${OUT}/vic-${name}.png` });
    rows.push({ route: r, status: resp.status(), xrobots: resp.headers()["x-robots-tag"] ?? null, noindex: /<meta name="robots" content="noindex/.test(html),
      twofa: text.includes("Verificação em duas etapas desligada"), secret: SECRET.test(html), forbidden: text.includes("Este painel é só do Super Admin") });
  }
  result.vic = rows;
  log(`Vic: status ${JSON.stringify([...new Set(rows.map((x) => x.status))])}; noindex meta ${rows.filter((x) => x.noindex).length}/${rows.length}; X-Robots-Tag ${rows.filter((x) => x.xrobots).length}/${rows.length} (${rows[0].xrobots}); faixa 2FA ${rows.filter((x) => x.twofa).length}/${rows.length}; segredo no HTML ${rows.filter((x) => x.secret).length}; 403 ${rows.filter((x) => x.forbidden).length}`);
  log(`  sem faixa 2FA: ${JSON.stringify(rows.filter((x) => !x.twofa).map((x) => x.route))}; sem noindex: ${JSON.stringify(rows.filter((x) => !x.noindex).map((x) => x.route))}`);
  await context.close();
}

for (const [loc, probe] of [["en", "Two-step verification is off"], ["es", "Verificación en dos pasos desactivada"]]) {
  if (process.env.I18N_STEP !== loc) continue;
  const context = await browser.newContext({ locale: loc, viewport: { width: 1440, height: 900 } });
  const page = await login(context, "vic@hellosquad.example");
  const rows = [];
  for (const r of ROUTES) {
    await page.goto(`${BASE}${r}`);
    const text = await page.locator("body").innerText();
    const pt = ["Contas", "Catálogo", "Planos e recargas", "Pagamentos", "Auditoria", "Fila de trabalhos", "Verificação em duas etapas", "Créditos em saldo", "Provisório", "Motivo"].filter((w) => text.includes(w));
    rows.push({ route: r, probe: text.includes(probe), pt });
  }
  await page.goto(`${BASE}/admin/contas`);
  await page.screenshot({ path: `${OUT}/vic-${loc}-contas.png` });
  result.i18n[loc] = rows;
  log(`Vic em ${loc}: faixa traduzida em ${rows.filter((x) => x.probe).length}/${rows.length}; telas com palavra pt-BR: ${JSON.stringify(rows.filter((x) => x.pt.length).map((x) => [x.route, x.pt]))}`);
  await context.close();
}
await browser.close();
writeFileSync(`${OUT}/../06_web_admin.json`, JSON.stringify(result, null, 1));
log(`erros de console: ${result.console.length} ${JSON.stringify(result.console.slice(0, 5))}`);
