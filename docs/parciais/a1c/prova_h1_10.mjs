// A1c · prova da H1-10 contra o web no ar (build de produção): cookie da sessão e a ação do token do Realtime.
// Uso (a partir de apps/web): node ../../docs/parciais/a1c/prova_h1_10.mjs [http://127.0.0.1:3100]
// Nunca imprime token: o JWT sai como "eyJ***".
import { chromium } from "/home/vitao/projetos/hellosquad/node_modules/.pnpm/playwright@1.64.1/node_modules/playwright/index.mjs";

const BASE = process.argv[2] || "http://127.0.0.1:3100";
const b = await chromium.launch();
const ctx = await b.newContext();
const actions = [];
ctx.on("request", (req) => {
  const id = req.headers()["next-action"];
  if (id && req.method() === "POST") actions.push({ id, url: req.url(), body: req.postData() ?? "" });
});
const p = await ctx.newPage();
const loginAt = Date.now();
await p.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
await p.getByLabel("Seu e-mail").fill("marina@miolo.example");
await p.getByLabel("Sua senha").fill("Senha!Teste123");
await p.getByRole("button", { name: "Entrar" }).click();
await p.waitForURL(/\/app\/miolo/, { timeout: 30000 });
await p.waitForTimeout(4000); // o Realtime pede o token ao entrar no canal

const out = {};
const sb = (await ctx.cookies()).filter((c) => c.name.startsWith("sb-"));
out.cookies = sb.map((c) => ({
  name: c.name,
  httpOnly: c.httpOnly,
  secure: c.secure,
  sameSite: c.sameSite,
  path: c.path,
  diasDeValidade: c.expires > 0 ? Math.round(((c.expires * 1000 - loginAt) / 86_400_000) * 100) / 100 : "sessao",
}));
const token = actions.find((a) => a.body === "[]" && /\/app\//.test(a.url));
out.acaoDoToken = token ? { id: token.id.slice(0, 8) + "…", chamadaEm: new URL(token.url).pathname } : null;

const cookie = sb.map((c) => `${c.name}=${c.value}`).join("; ");
async function call(pathName, extra = {}) {
  const r = await fetch(`${BASE}${pathName}`, {
    method: "POST",
    redirect: "manual",
    headers: { "next-action": token.id, accept: "text/x-component", "content-type": "text/plain;charset=UTF-8", origin: BASE, cookie, ...extra },
    body: "[]",
  });
  const text = await r.text();
  return {
    status: r.status,
    devolveToken: /"token":"eyJ/.test(text),
    resposta: (text.match(/\{"ok":[^\n]*/) ?? [""])[0].replace(/eyJ[A-Za-z0-9._-]+/g, "eyJ***").slice(0, 120),
  };
}
if (token) {
  out.replay = {
    "/app/miolo": await call("/app/miolo"),
    "/": await call("/"),
    "/ com o cabeçalho forjado": await call("/", { "x-hellosquad-action-path": "/app/miolo" }),
    "/sair": await call("/sair"),
    "/sair com o cabeçalho forjado": await call("/sair", { "x-hellosquad-action-path": "/app/miolo" }),
  };
}
console.log(JSON.stringify(out, null, 2));
await b.close();
