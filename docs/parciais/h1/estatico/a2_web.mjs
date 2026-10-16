// H1 estático, Parte A (itens 1 a 4) contra o web local em execução. Só leitura: faz login pela Auth local
// (permitido) e GETs; o único PUT é na Auth com senha fraca ("a"), recusado antes de qualquer gravação.
// Rodar a partir de apps/web:  cd apps/web && node ../../docs/parciais/h1/estatico/a2_web.mjs
// Saída completa: /tmp/h1_est_a2_result.json; no terminal só o resumo (tokens mascarados).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { chromium } = require("@playwright/test");

const BASE = "http://127.0.0.1:3100";
const API = "http://127.0.0.1:8100";
const SB = "http://127.0.0.1:56321";
const PASS = "Senha!Teste123";
const env = Object.fromEntries(
  fs.readFileSync(path.resolve(process.cwd(), "../../.env"), "utf8").split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const PUB = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const mask = (t) => (t ? `${String(t).slice(0, 10)}***(${String(t).length})` : t);
const claims = (jwt) => JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
const R = { cases: {} };
const norm = (raw) => { const d = JSON.parse(raw); return Array.isArray(d) ? { join_ref: d[0], ref: d[1], topic: d[2], event: d[3], payload: d[4] } : d; };
const log = (...a) => console.log(...a);

async function authLogin(email) {
  const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: PUB, "content-type": "application/json" }, body: JSON.stringify({ email, password: PASS }),
  });
  return (await r.json()).access_token;
}

async function workspaceId(token, slug) {
  const r = await fetch(`${API}/workspaces`, { headers: { authorization: `Bearer ${token}` } });
  const j = await r.json();
  const list = Array.isArray(j) ? j : j.items ?? j.data ?? [];
  const w = list.map((x) => x.workspace ?? x).find((x) => x.slug === slug);
  return w?.id;
}

// Entra no canal privado workspace:<id> pelo protocolo Phoenix do Realtime, com o token dado.
function realtimeJoin(token, wsId, isPrivate = true) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${SB.replace("http", "ws")}/realtime/v1/websocket?apikey=${PUB}&vsn=1.0.0`);
    const out = { reply: null, after: [] };
    const done = () => { try { ws.close(); } catch {} resolve(out); };
    const timer = setTimeout(done, 6000);
    ws.onopen = () => {
      const payload = { config: { broadcast: { ack: false, self: false }, presence: { key: "", enabled: false }, postgres_changes: [], private: isPrivate } };
      if (token) payload.access_token = token;
      ws.send(JSON.stringify({ topic: `realtime:workspace:${wsId}`, event: "phx_join", payload, ref: "1", join_ref: "1" }));
    };
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.event === "phx_reply" && d.ref === "1") out.reply = { status: d.payload?.status, response: JSON.stringify(d.payload?.response ?? {}).slice(0, 160) };
      else if (d.event !== "presence_state") out.after.push(`${d.event}:${JSON.stringify(d.payload ?? {}).slice(0, 140)}`);
      if (out.reply && out.reply.status !== "ok") { clearTimeout(timer); setTimeout(done, 300); }
      else if (out.reply && out.after.length >= 1) { clearTimeout(timer); done(); }
    };
    ws.onerror = (e) => { out.error = String(e?.message ?? e); };
  });
}

async function uiLogin(ctx, email, nextRaw, tamper) {
  const page = await ctx.newPage();
  const url = nextRaw === undefined ? `${BASE}/entrar` : `${BASE}/entrar?next=${nextRaw}`;
  await page.goto(url, { waitUntil: "load", timeout: 90000 });
  await page.waitForSelector('input[name="email"]', { timeout: 60000 });
  const hidden = await page.locator('input[name="next"]').getAttribute("value").catch(() => null);
  if (tamper !== undefined) {
    await page.evaluate((v) => {
      const f = document.querySelector("form");
      let i = f.querySelector('input[name="next"]');
      if (!i) { i = document.createElement("input"); i.type = "hidden"; i.name = "next"; f.appendChild(i); }
      i.value = v;
    }, tamper);
  }
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState("load", { timeout: 30000 }).catch(() => {});
  return { page, hidden };
}

const tokM0 = await authLogin("marina@miolo.example");
const tokR0 = await authLogin("rafael@vitta.example");
const miolo = await workspaceId(tokM0, "miolo"), vitta = await workspaceId(tokR0, "vitta");
const browser = await chromium.launch();
try {
  // ---------- 1 e 2: login real (Marina), cookies, CSP no console, websocket do Realtime, ação do token ----------
  const ctxM = await browser.newContext();
  await ctxM.addInitScript(() => {
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  const consoleCsp = [], wsLog = [], actions = [];
  ctxM.on("console", (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) consoleCsp.push(m.text().slice(0, 200)); });
  ctxM.on("request", (req) => {
    const id = req.headers()["next-action"];
    if (id) actions.push({ id, url: req.url(), body: (req.postData() ?? "").slice(0, 60), req });
  });
  const { page: pM } = await uiLogin(ctxM, "marina@miolo.example");
  pM.on("websocket", () => {});
  R.cases.loginFinalUrl = pM.url();
  // abre /app/miolo de novo, agora já ouvindo o websocket
  const wsSeen = new Promise((resolve) => {
    pM.on("websocket", (ws) => {
      const entry = { url: ws.url().replace(/apikey=[^&]+/, "apikey=***"), joins: [], replies: [] };
      wsLog.push(entry);
      ws.on("framesent", (f) => {
        try { const d = norm(f.payload); if (d.event === "phx_join") entry.joins.push({ topic: d.topic, ref: d.ref, private: d.payload?.config?.private, hasToken: Boolean(d.payload?.access_token) }); } catch {}
      });
      ws.on("framereceived", (f) => {
        try { const d = norm(f.payload); if (d.event === "phx_reply" && d.topic !== "phoenix") { entry.replies.push({ topic: d.topic, status: d.payload?.status }); if (d.payload?.status === "ok" && /workspace:/.test(d.topic)) resolve(true); } } catch {}
      });
    });
    setTimeout(() => resolve(false), 30000);
  });
  await pM.goto(`${BASE}/app/miolo`, { waitUntil: "load", timeout: 90000 });
  R.cases.realtimeJoinedInBrowser = await wsSeen;
  R.cases.wsLog = wsLog;
  R.cases.cspViolationsEvent = await pM.evaluate(() => window.__csp);
  R.cases.consoleCsp = consoleCsp;
  const cookies = await ctxM.cookies();
  R.cases.sbCookies = cookies.filter((c) => c.name.startsWith("sb-")).map((c) => ({ name: c.name, httpOnly: c.httpOnly, sameSite: c.sameSite, secure: c.secure, path: c.path, expires: c.expires > 0 ? new Date(c.expires * 1000).toISOString() : "sessao", len: c.value.length }));
  const docCookie = await pM.evaluate(() => document.cookie);
  R.cases.documentCookie = { len: docCookie.length, hasSb: /sb-/.test(docCookie), hasJwt: /eyJ/.test(docCookie), hasBase64: /base64-/.test(docCookie), names: docCookie.split(";").map((s) => s.split("=")[0].trim()).filter(Boolean) };

  // Qual ação devolve o token? (POST com Next-Action e corpo "[]")
  let tokenAction = null;
  for (const a of actions) {
    const resp = await a.req.response().catch(() => null);
    const body = resp ? await resp.text().catch(() => "") : "";
    (R.cases.actionsSeen ??= []).push({ id: a.id.slice(0, 8), url: a.url, body: a.body, status: resp?.status(), len: body.length, hasToken: /token/.test(body), snippet: body.replace(/eyJ[A-Za-z0-9._-]+/g, "eyJ***").slice(0, 100) });
    if (/"token":"eyJ/.test(body) || /eyJ[A-Za-z0-9_-]{20,}\./.test(body)) { tokenAction = { id: a.id, url: a.url, body: a.body, respHeaders: resp.headers() }; break; }
  }
  R.cases.tokenAction = tokenAction ? { id: tokenAction.id, url: tokenAction.url, body: tokenAction.body, cacheControl: tokenAction.respHeaders["cache-control"] ?? null, acao: tokenAction.respHeaders["access-control-allow-origin"] ?? null, contentType: tokenAction.respHeaders["content-type"] } : null;

  const cookieHeader = (cs) => cs.filter((c) => c.name.startsWith("sb-")).map((c) => `${c.name}=${c.value}`).join("; ");
  async function callAction(cookie, extra = {}, pathName = "/app/miolo") {
    const r = await fetch(`${BASE}${pathName}`, {
      method: "POST", redirect: "manual",
      headers: { "next-action": tokenAction.id, accept: "text/x-component", "content-type": "text/plain;charset=UTF-8", origin: BASE, ...(cookie ? { cookie } : {}), ...extra },
      body: "[]",
    });
    const text = await r.text();
    const tok = (text.match(/"token":"(eyJ[^"]+)"/) ?? [])[1];
    return { status: r.status, cc: r.headers.get("cache-control"), acao: r.headers.get("access-control-allow-origin"), vary: r.headers.get("vary"), setCookie: r.headers.get("set-cookie") ? "sim" : "nao", refresh: /refresh_token/.test(text), token: tok, snippet: text.replace(/eyJ[A-Za-z0-9._-]+/g, "eyJ***").slice(0, 160) };
  }

  if (tokenAction) {
    const cM = cookieHeader(cookies);
    const a1 = await callAction(null);
    const a2 = await callAction(cM);
    const a3 = await callAction(cM, { origin: "http://evil.example" });
    const a3b = await callAction(cM, { origin: "http://localhost:3100" });
    const a3c = await callAction(cM, { origin: "null" });
    const pre = await fetch(`${BASE}/app/miolo`, { method: "OPTIONS", headers: { origin: "http://evil.example", "access-control-request-method": "POST", "access-control-request-headers": "next-action,content-type" } });
    const a4 = await callAction(cM, {}, "/"); // mesma ação chamada pela página pública
    R.cases.action = {
      semSessao: { ...a1, token: mask(a1.token) },
      marina: { ...a2, token: mask(a2.token) },
      origemEvil: { ...a3, token: mask(a3.token) },
      origemLocalhost: { ...a3b, token: mask(a3b.token) },
      origemNull: { ...a3c, token: mask(a3c.token) },
      preflightEvil: { status: pre.status, acao: pre.headers.get("access-control-allow-origin"), acam: pre.headers.get("access-control-allow-methods") },
      viaPaginaPublica: { ...a4, token: mask(a4.token) },
    };
    // Rafael (Vitta) chamando a ação na URL da Miolo
    const ctxR = await browser.newContext();
    await uiLogin(ctxR, "rafael@vitta.example");
    const cR = cookieHeader(await ctxR.cookies());
    const a5 = await callAction(cR, {}, "/app/miolo");
    R.cases.action.rafaelNaUrlDaMiolo = { ...a5, token: mask(a5.token) };
    await ctxR.close();

    // ---------- alcance do token devolvido ----------
    const tM = a2.token, tR = a5.token;
    if (tM) {
      const c = claims(tM);
      R.cases.tokenClaims = { role: c.role, aud: c.aud, iss: c.iss, aal: c.aal, ttl_s: c.exp - c.iat, session_id: Boolean(c.session_id), sub: mask(c.sub) };
    }
    R.cases.ids = { miolo: mask(miolo), vitta: mask(vitta) };
    R.cases.realtime = {
      marinaPrivadoMiolo: await realtimeJoin(tM, miolo),
      rafaelPrivadoMiolo: await realtimeJoin(tR, miolo),
      rafaelPrivadoVitta: await realtimeJoin(tR, vitta),
      anonPrivadoMiolo: await realtimeJoin(null, miolo),
      rafaelPublicoMiolo: await realtimeJoin(tR, miolo, false),
    };
    const H = (t) => ({ authorization: `Bearer ${t}`, apikey: PUB });
    const g = async (u, t, init = {}) => { const r = await fetch(u, { headers: { ...H(t), "content-type": "application/json" }, ...init }); const tx = await r.text(); return { status: r.status, body: tx.replace(/eyJ[A-Za-z0-9._-]+/g, "eyJ***").slice(0, 140) }; };
    R.cases.alcance = {
      authUser: await g(`${SB}/auth/v1/user`, tM),
      authTrocaSenhaFraca: await g(`${SB}/auth/v1/user`, tM, { method: "PUT", body: JSON.stringify({ password: "a" }) }),
      apiWorkspaces: await g(`${API}/workspaces`, tM),
      apiVittaComTokenMarina: await g(`${API}/workspaces/${vitta}`, tM),
      dataApiWorkspaces: await g(`${SB}/rest/v1/workspaces?select=slug`, tM),
      storageBuckets: await g(`${SB}/storage/v1/bucket`, tM),
    };
  }

  fs.writeFileSync("/tmp/h1_est_a2_result.json", JSON.stringify(R, null, 1));
  { const c = R.cases;
    log("login final:", c.loginFinalUrl, "| realtime no browser (phx_reply ok em workspace:*):", c.realtimeJoinedInBrowser);
    log("ws:", JSON.stringify(c.wsLog).slice(0, 400));
    log("violacoes CSP (evento):", JSON.stringify(c.cspViolationsEvent), "| console CSP:", JSON.stringify(c.consoleCsp).slice(0, 300));
    log("cookies sb-*:", JSON.stringify(c.sbCookies));
    log("document.cookie:", JSON.stringify(c.documentCookie));
    log("acao do token:", JSON.stringify(c.tokenAction)); log("acoes vistas:", JSON.stringify(c.actionsSeen ?? []).slice(0, 1200));
    log("acao chamadas:", String(JSON.stringify(c.action ?? null)).slice(0, 2500));
    log("claims do token:", JSON.stringify(c.tokenClaims), "| ids:", JSON.stringify(c.ids));
    log("realtime joins:", String(JSON.stringify(c.realtime ?? null)).slice(0, 1500));
    log("alcance do token:", String(JSON.stringify(c.alcance ?? null)).slice(0, 1500)); }
  // ---------- 4: noindex (logado, Marina) ----------
  const routes = ["/app", "/app/miolo", "/app/miolo/equipe", "/app/miolo/modo-autonomo", "/app/miolo/memoria-da-marca", "/app/miolo/sala-do-squad", "/app/miolo/squad/nexo", "/app/inexistente", "/app/novo-workspace"];
  await pM.goto(`${BASE}/app/miolo/squad/nexo`, { waitUntil: "load", timeout: 90000 });
  const deep = await pM.locator('a[href*="/trabalho/"]').first().getAttribute("href").catch(() => null);
  if (deep) routes.push(deep);
  R.cases.noindex = [];
  for (const r of routes) {
    const resp = await pM.goto(`${BASE}${r}`, { waitUntil: "load", timeout: 90000 });
    const metas = await pM.$$eval('meta[name="robots"]', (ms) => ms.map((m) => m.content));
    const h = resp.headers();
    R.cases.noindex.push({ r, final: new URL(pM.url()).pathname, status: resp.status(), xrt: h["x-robots-tag"] ?? null, metas, csp: Boolean(h["content-security-policy"]), cspWs: /ws:\/\/127\.0\.0\.1:56321/.test(h["content-security-policy"] ?? "") });
  }
  R.cases.cspViolationsAposRotas = await pM.evaluate(() => window.__csp);
  R.cases.consoleCspAposRotas = consoleCsp.slice(0, 10);

  // /sair com next: sair sempre volta a /entrar
  await pM.goto(`${BASE}/sair?next=https://evil.example`, { waitUntil: "load", timeout: 90000 });
  const metasSair = await pM.$$eval('meta[name="robots"]', (ms) => ms.map((m) => m.content));
  await pM.click('form button[type="submit"]');
  await pM.waitForURL((u) => u.pathname !== "/sair", { timeout: 30000 }).catch(() => {});
  R.cases.sair = { final: pM.url(), metasSair };
  await ctxM.close();

  // /entrar deslogado: meta robots
  const ctxA = await browser.newContext();
  const pA = await ctxA.newPage();
  const rE = await pA.goto(`${BASE}/entrar`, { waitUntil: "load", timeout: 90000 });
  R.cases.entrarAnon = { xrt: rE.headers()["x-robots-tag"] ?? null, metas: await pA.$$eval('meta[name="robots"]', (ms) => ms.map((m) => m.content)) };
  await ctxA.close();

  fs.writeFileSync("/tmp/h1_est_a2_result.json", JSON.stringify(R, null, 1));
  log("noindex:"); for (const n of R.cases.noindex ?? []) log("  ", JSON.stringify(n));
  log("CSP apos rotas:", JSON.stringify(R.cases.cspViolationsAposRotas), JSON.stringify(R.cases.consoleCspAposRotas).slice(0, 300));
  log("sair:", JSON.stringify(R.cases.sair), "| entrar anon:", JSON.stringify(R.cases.entrarAnon));
  // ---------- 3: ?next= ----------
  const nexts = [
    ["//evil.example", "//evil.example"], ["https://evil.example", "https://evil.example"], ["/\\evil.example", "/%5Cevil.example"],
    ["%2F%2Fevil.example", "%2F%2Fevil.example"], ["%252F%252Fevil.example", "%252F%252Fevil.example"], ["/app@evil.example", "/app@evil.example"],
    ["javascript:alert(1)", "javascript:alert(1)"], ["/app/vitta", "/app/vitta"], ["/app//evil.example", "/app//evil.example"],
    ["/app/%2F%2Fevil.example", "/app/%252F%252Fevil.example"], ["/app/..%2F..%2Fevil", "/app/..%252F..%252Fevil"], ["/app?x=https://evil.example", "/app?x=https://evil.example"],
    ["%09//evil.example", "%09//evil.example"], ["/app\\@evil.example", "/app%5C@evil.example"],
  ];
  R.cases.next = [];
  const jobs = [
    ...nexts.map(([label, raw]) => async () => {
      const ctx = await browser.newContext();
      try {
        const { page, hidden } = await uiLogin(ctx, "marina@miolo.example", raw);
        const u = new URL(page.url());
        const html = await page.content();
        return { caso: label, hiddenNext: hidden, final: `${u.origin}${u.pathname}${u.search}`, foraDoSite: u.origin !== BASE, vazaVitta: Boolean(vitta && html.includes(vitta)) || /Rafael|Carla/.test(html), titulo: await page.title() };
      } catch (e) { return { caso: label, erro: String(e).slice(0, 120) }; } finally { await ctx.close(); }
    }),
    ...["//evil.example", "https://evil.example", "/\\evil.example", "javascript:alert(1)", "/app@evil.example"].map((v) => async () => {
      const ctx = await browser.newContext();
      try {
        const { page } = await uiLogin(ctx, "marina@miolo.example", undefined, v);
        const u = new URL(page.url());
        return { caso: `adulterado ${v}`, final: `${u.origin}${u.pathname}`, foraDoSite: u.origin !== BASE };
      } catch (e) { return { caso: `adulterado ${v}`, erro: String(e).slice(0, 120) }; } finally { await ctx.close(); }
    }),
  ];
  for (let i = 0; i < jobs.length; i += 5) {
    const res = await Promise.all(jobs.slice(i, i + 5).map((j) => j()));
    for (const r of res) { R.cases.next.push(r); log("  next", JSON.stringify(r)); }
    fs.writeFileSync("/tmp/h1_est_a2_result.json", JSON.stringify(R, null, 1));
  }
} finally {
  await browser.close();
}

fs.writeFileSync("/tmp/h1_est_a2_result.json", JSON.stringify(R, null, 1));
log("fim");
