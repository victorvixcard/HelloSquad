// H1 estático, itens 1 e 4 numa rota funda real (trabalho de um agente), logado como Marina.
// Rodar a partir de apps/web:  cd apps/web && node ../../docs/parciais/h1/estatico/a3_rota_funda.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { chromium } = require("@playwright/test");
const BASE = "http://127.0.0.1:3100", API = "http://127.0.0.1:8100", SB = "http://127.0.0.1:56321";
const env = Object.fromEntries(fs.readFileSync(path.resolve(process.cwd(), "../../.env"), "utf8").split("\n")
  .filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, "content-type": "application/json" }, body: JSON.stringify({ email: "marina@miolo.example", password: "Senha!Teste123" }) });
const tok = (await r.json()).access_token;
const ws = (await (await fetch(`${API}/workspaces`, { headers: { authorization: `Bearer ${tok}` } })).json()).items.find((w) => w.slug === "miolo");
const wi = await (await fetch(`${API}/workspaces/${ws.id}/work-items`, { headers: { authorization: `Bearer ${tok}` } })).json();
const item = (wi.items ?? wi)[0];
const agent = item?.agent ?? item?.agent_slug ?? item?.owner_agent ?? "nexo";
const deep = `/app/miolo/squad/${typeof agent === "string" ? agent : "nexo"}/trabalho/${item?.id}`;

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.addInitScript(() => { window.__csp = []; document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`)); });
const page = await ctx.newPage();
await page.goto(`${BASE}/entrar`, { waitUntil: "load" });
await page.fill('input[name="email"]', "marina@miolo.example");
await page.fill('input[name="password"]', "Senha!Teste123");
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 30000 });
const resp = await page.goto(`${BASE}${deep}`, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(2000);
const h = resp.headers();
console.log(JSON.stringify({
  rota: deep.replace(/[0-9a-f-]{36}/, "<id>"), status: resp.status(), final: new URL(page.url()).pathname.replace(/[0-9a-f-]{36}/, "<id>"),
  xrt: h["x-robots-tag"], metas: await page.$$eval('meta[name="robots"]', (ms) => ms.map((m) => m.content)),
  cspWsLocal: /ws:\/\/127\.0\.0\.1:56321/.test(h["content-security-policy"] ?? ""), frameAncestors: /frame-ancestors 'none'/.test(h["content-security-policy"] ?? ""),
  xfo: h["x-frame-options"], rp: h["referrer-policy"], xcto: h["x-content-type-options"], pp: Boolean(h["permissions-policy"]),
  violacoesCsp: await page.evaluate(() => window.__csp),
}));
await browser.close();
