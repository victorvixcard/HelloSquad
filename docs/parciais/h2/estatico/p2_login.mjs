// H2 estático P2 (adaptado de docs/parciais/h1/estatico/a2_web.mjs): login real pela tela /entrar (Playwright) contra a 3198,
// registra os atributos do cookie de sessão (valor mascarado), grava um cookie-jar Netscape para o curl
// (/tmp/h2_est_p2_jar.txt, 600) e confere cabeçalhos + meta robots de /app/** e /admin/** logado e anônimo.
// Rodar a partir de apps/web do worktree:  cd /tmp/h2_web/apps/web && node <repo>/docs/parciais/h2/estatico/p2_login.mjs
// Saída completa: /tmp/h2_est_p2_login.json.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { chromium } = require("@playwright/test");

const BASE = process.env.BASE ?? "http://127.0.0.1:3198";
const EMAIL = "marina@miolo.example";
const PASS = "Senha!Teste123";
const mask = (t) => (t ? `${String(t).slice(0, 10)}***(${String(t).length})` : t);
const R = { base: BASE, quando: new Date().toISOString() };
const log = (...a) => console.log(...a);

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext();
  const setCookies = [];
  ctx.on("response", async (resp) => {
    try {
      const hs = await resp.headersArray();
      for (const h of hs) {
        if (h.name.toLowerCase() !== "set-cookie") continue;
        for (const line of h.value.split("\n")) {
          const [nv, ...attrs] = line.split(";").map((s) => s.trim());
          const name = nv.slice(0, nv.indexOf("="));
          const value = nv.slice(nv.indexOf("=") + 1);
          setCookies.push({ url: new URL(resp.url()).pathname, status: resp.status(), method: resp.request().method(), name, value: mask(value), attrs });
        }
      }
    } catch {}
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/entrar`, { waitUntil: "load", timeout: 90000 });
  await page.waitForSelector('input[name="email"]', { timeout: 60000 });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState("load", { timeout: 30000 }).catch(() => {});
  R.loginFinalUrl = page.url();
  R.setCookies = setCookies;
  const cookies = await ctx.cookies();
  const now = Date.now() / 1000;
  R.cookies = cookies.map((c) => ({
    name: c.name, domain: c.domain, path: c.path, httpOnly: c.httpOnly, sameSite: c.sameSite, secure: c.secure,
    expires: c.expires > 0 ? new Date(c.expires * 1000).toISOString() : "sessao",
    duracaoDias: c.expires > 0 ? +((c.expires - now) / 86400).toFixed(2) : null, value: mask(c.value),
  }));
  const jar = ["# Netscape HTTP Cookie File"].concat(cookies.map((c) =>
    [`${c.httpOnly ? "#HttpOnly_" : ""}${c.domain}`, "FALSE", c.path, c.secure ? "TRUE" : "FALSE", String(Math.max(0, Math.round(c.expires))), c.name, c.value].join("\t")));
  fs.writeFileSync("/tmp/h2_est_p2_jar.txt", jar.join("\n") + "\n", { mode: 0o600 });
  R.documentCookie = await page.evaluate(() => document.cookie.split(";").map((s) => s.split("=")[0].trim()).filter(Boolean));

  async function probe(p, rota) {
    const resp = await p.goto(`${BASE}${rota}`, { waitUntil: "load", timeout: 90000 });
    const h = resp.headers();
    const metas = await p.$$eval('meta[name="robots"]', (ms) => ms.map((m) => m.content)).catch(() => []);
    const chain = [];
    for (let rq = resp.request().redirectedFrom(); rq; rq = rq.redirectedFrom()) {
      const rr = await rq.response(); chain.unshift({ url: new URL(rq.url()).pathname, status: rr?.status(), xrt: rr?.headers()["x-robots-tag"] ?? null });
    }
    return { rota, final: new URL(p.url()).pathname, status: resp.status(), redirects: chain, xrt: h["x-robots-tag"] ?? null, metas,
      csp: h["content-security-policy"] ? (/'nonce-/.test(h["content-security-policy"]) ? "nonce" : "sem-nonce") : null,
      frameAncestors: (h["content-security-policy"] ?? "").match(/frame-ancestors [^;]*/)?.[0] ?? null,
      xfo: h["x-frame-options"] ?? null, rp: h["referrer-policy"] ?? null, xcto: h["x-content-type-options"] ?? null,
      pp: h["permissions-policy"] ? "s" : null, hsts: h["strict-transport-security"] ?? null, cc: h["cache-control"] ?? null };
  }
  const rotas = ["/app", "/app/miolo", "/app/miolo/equipe", "/app/miolo/squad/nexo", "/app/novo-workspace", "/app/inexistente", "/admin", "/admin/usuarios", "/entrar", "/"];
  R.logado = [];
  for (const r of rotas) R.logado.push(await probe(page, r));
  await ctx.close();
  const ctxA = await browser.newContext();
  const pA = await ctxA.newPage();
  R.anon = [];
  for (const r of ["/app", "/app/miolo", "/admin", "/admin/usuarios", "/entrar", "/criar-conta", "/sair"]) R.anon.push(await probe(pA, r));
  await ctxA.close();
} finally {
  await browser.close();
}
fs.writeFileSync("/tmp/h2_est_p2_login.json", JSON.stringify(R, null, 1));
log("login final:", R.loginFinalUrl);
log("Set-Cookie vistos:"); for (const s of R.setCookies) log("  ", JSON.stringify(s));
log("cookies do contexto:"); for (const c of R.cookies) log("  ", JSON.stringify(c));
log("document.cookie (nomes):", JSON.stringify(R.documentCookie));
log("logado:"); for (const n of R.logado) log("  ", JSON.stringify(n));
log("anon:"); for (const n of R.anon) log("  ", JSON.stringify(n));
