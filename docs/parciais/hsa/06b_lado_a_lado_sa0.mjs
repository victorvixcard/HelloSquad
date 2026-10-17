import { createRequire } from "node:module";
const require = createRequire("/home/vitao/projetos/hellosquad/apps/web/package.json");
const { chromium } = require("@playwright/test");
const SA0 = "file:///home/vitao/projetos/hellosquad/design/super-admin-proto";
const OUT = "/home/vitao/projetos/hellosquad/docs/parciais/hsa/web";
const MIOLO = "6bcdc5bd-3c9a-4a7a-bb83-22b2ba88edc2";
const PAIRS = [["contas.html", "/admin/contas"], ["conta.html", `/admin/contas/${MIOLO}`], ["catalogo.html", "/admin/catalogo"], ["planos.html", "/admin/planos"],
  ["pagamentos.html", "/admin/pagamentos"], ["auditoria.html", "/admin/auditoria"], ["fila.html", "/admin/fila"], ["modelos.html", "/admin/modelos"],
  ["squad.html", "/admin/squad"], ["agente.html", "/admin/squad/otto"], ["regras.html", "/admin/regras"], ["consumo.html", "/admin/consumo"],
  ["saude-apis.html", "/admin/saude"], ["qualidade.html", "/admin/qualidade"]];
const browser = await chromium.launch();
const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const a = await ctxA.newPage();
const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const b = await ctxB.newPage();
await b.goto("http://127.0.0.1:3100/entrar");
await b.getByLabel("Seu e-mail").fill("vic@hellosquad.example");
await b.getByLabel("Sua senha").fill("Senha!Teste123");
await b.getByRole("button", { name: "Entrar" }).click();
await b.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 30000 });
console.log("Vic depois do login cai em:", new URL(b.url()).pathname);
const grab = async (p) => p.evaluate(() => {
  const t = (sel) => [...document.querySelectorAll(sel)].map((e) => e.innerText.trim().replace(/\s+/g, " ")).filter(Boolean);
  return { nav: t("nav a, aside a, nav button").slice(0, 40), h1: t("h1"), h2: t("h2").slice(0, 12), buttons: t("main button, [role=main] button").slice(0, 25), tabs: t("[role=tab]") };
});
for (const [f, r] of PAIRS) {
  await a.goto(`${SA0}/${f}`); await a.waitForTimeout(400);
  await b.goto(`http://127.0.0.1:3100${r}`); await b.waitForLoadState("networkidle").catch(() => {});
  const A = await grab(a), B = await grab(b);
  const only = (x, y) => x.filter((s) => !y.some((z) => z.toLowerCase() === s.toLowerCase()));
  console.log(`\n## ${f} × ${r}`);
  console.log("  h1 SA0:", JSON.stringify(A.h1), "| nosso:", JSON.stringify(B.h1));
  console.log("  abas só no SA0:", JSON.stringify(only(A.tabs, B.tabs)), "| só no nosso:", JSON.stringify(only(B.tabs, A.tabs)));
  console.log("  h2 só no SA0:", JSON.stringify(only(A.h2, B.h2)), "| só no nosso:", JSON.stringify(only(B.h2, A.h2)));
  console.log("  botões só no SA0:", JSON.stringify(only(A.buttons, B.buttons).slice(0, 12)), "| só no nosso:", JSON.stringify(only(B.buttons, A.buttons).slice(0, 12)));
  if (f === "contas.html") console.log("  barra SA0:", JSON.stringify(A.nav), "\n  barra nossa:", JSON.stringify(B.nav));
  await a.screenshot({ path: `${OUT}/sa0-${f.replace(".html", "")}.png` });
}
await browser.close();
