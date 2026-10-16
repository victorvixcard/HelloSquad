// A0b, H0-02 — confere no Chromium (Playwright) que a CSP não quebra as páginas públicas e de sessão.
// Não faz login nem altera o banco. Web já de pé (next start). Rodar da raiz:
//   WEB=http://127.0.0.1:3101 node docs/parciais/a0b/csp-check.mjs
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const require = createRequire(new URL("../../../apps/web/", import.meta.url));
const pw = await import(pathToFileURL(require.resolve("@playwright/test")));
const chromium = pw.chromium ?? pw.default?.chromium;

const WEB = process.env.WEB || "http://127.0.0.1:3101";
const PAGES = ["/", "/entrar", "/criar-conta", "/sair"];

const browser = await chromium.launch();
let failures = 0;
for (const path of PAGES) {
  const page = await browser.newPage();
  const consoleCsp = [];
  const errors = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) consoleCsp.push(m.text().slice(0, 160));
  });
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  // Guarda os eventos de violação antes de qualquer script da página rodar.
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) =>
      window.__csp.push(`${e.violatedDirective} ${e.blockedURI || "inline"}`),
    );
  });
  const res = await page.goto(WEB + path, { waitUntil: "networkidle" });
  const info = await page.evaluate(() => {
    const exec = [...document.scripts].filter((s) => !s.type || s.type === "module" || /javascript/.test(s.type));
    const main = document.querySelector("main") ?? document.body;
    return {
      violations: window.__csp,
      scripts: exec.length,
      withNonce: exec.filter((s) => s.nonce).length,
      // O React marca o nó hidratado com __reactFiber$…; sem isso, o JS da página não rodou.
      hydrated: Object.keys(main).some((k) => k.startsWith("__reactFiber")),
    };
  });
  const csp = res.headers()["content-security-policy"] ?? "";
  const mode = csp.includes("'nonce-") ? "nonce" : "estática";
  const ok = info.violations.length === 0 && consoleCsp.length === 0 && errors.length === 0 && info.hydrated;
  if (!ok) failures++;
  console.log(
    `${ok ? "OK  " : "FALHA"} ${path} status=${res.status()} csp=${mode} violações=${info.violations.length}` +
      ` console_csp=${consoleCsp.length} erros=${errors.length} hidratada=${info.hydrated}` +
      ` scripts=${info.scripts} com_nonce=${info.withNonce}`,
  );
  for (const v of [...info.violations, ...consoleCsp, ...errors]) console.log(`      ${v}`);
  await page.close();

  // Controle negativo: o mesmo HTML com um XSS simulado (script inline e onerror= sem nonce),
  // mantidos os cabeçalhos da resposta. (page.evaluate não serve: roda com privilégio de DevTools.)
  const evil = await browser.newPage();
  await evil.route(WEB + path, async (route) => {
    const original = await route.fetch();
    const xss = '<script>window.__xss=true</script><img src="/a0b-inexistente.png" onerror="window.__xssAttr=true">';
    await route.fulfill({ response: original, body: (await original.text()).replace("</body>", `${xss}</body>`) });
  });
  await evil.goto(WEB + path, { waitUntil: "networkidle" });
  const ran = await evil.evaluate(() => ({ script: window.__xss === true, attr: window.__xssAttr === true }));
  console.log(
    `      controle XSS: <script> ${ran.script ? "RODOU" : "barrado"}, onerror= ${ran.attr ? "RODOU" : "barrado"}`,
  );
  if (mode === "nonce" && (ran.script || ran.attr)) failures++;
  await evil.close();
}

// Controle negativo: outra origem tenta pôr /entrar num iframe (clickjacking).
const framer = await browser.newPage();
const framed = [];
framer.on("console", (m) => /frame-ancestors|X-Frame-Options/i.test(m.text()) && framed.push(m.text().slice(0, 120)));
await framer.setContent(`<iframe src="${WEB}/entrar"></iframe>`);
await framer.waitForTimeout(1500);
const frameLoaded = await framer.frames()[1]?.evaluate(() => document.title).catch(() => null);
console.log(`controle: iframe de /entrar ${frameLoaded ? `CARREGOU (${frameLoaded})` : "recusado"}; ${framed[0] ?? ""}`);
if (frameLoaded) failures++;
await browser.close();
console.log(failures === 0 ? "csp-check: 0 violação, todas hidratadas" : `csp-check: ${failures} página(s) com problema`);
process.exit(failures === 0 ? 0 : 1);
