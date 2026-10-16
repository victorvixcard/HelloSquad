// H1 alvo 3 — Realtime não vaza canal entre tenants. Clientes reais do supabase-js (o mesmo do web) para
// Marina (controle positivo), Rafael (owner da Vitta), Pedro (sem workspace) e anônimo, no canal privado
// `workspace:<Miolo>`; Rafael também num canal público com o mesmo nome. A sonda é um broadcast do próprio
// banco (`app.broadcast_to_workspace`, o que as triggers usam), disparado pelo orquestrador via psql.
// Uso: node docs/parciais/h1/04_realtime_tenants.mjs (a partir de qualquer pasta).
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const require = createRequire("/home/vitao/projetos/hellosquad/apps/web/package.json");
const { createClient } = require("@supabase/supabase-js");
const env = Object.fromEntries(
  readFileSync("/home/vitao/projetos/hellosquad/.env", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const URL = env.SUPABASE_URL, PK = env.SUPABASE_PUBLISHABLE_KEY;
const MIOLO = "6bcdc5bd-3c9a-4a7a-bb83-22b2ba88edc2";
const VITTA = "fc0bba8b-f2b1-46fd-a843-b5ff0cc3ea7b";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function client(email) {
  const c = createClient(URL, PK, { auth: { persistSession: false, autoRefreshToken: false } });
  if (email) {
    const { data, error } = await c.auth.signInWithPassword({ email, password: "Senha!Teste123" });
    if (error) throw error;
    await c.realtime.setAuth(data.session.access_token);
  }
  return c;
}

async function listen(label, c, topic, isPrivate) {
  const got = [];
  let status = "?";
  const ch = c.channel(topic, { config: { private: isPrivate, broadcast: { self: false } } });
  ch.on("broadcast", { event: "*" }, (m) => got.push(m.event));
  await new Promise((resolve) => {
    ch.subscribe((s, err) => {
      status = s + (err ? `: ${String(err.message || err).slice(0, 120)}` : "");
      if (s !== "JOINING") resolve();
    });
    setTimeout(resolve, 6000);
  });
  return { label, topic: topic.replace(MIOLO, "<Miolo>").replace(VITTA, "<Vitta>"), private: isPrivate, get status() { return status; }, got };
}

const marina = await client("marina@miolo.example");
const rafael = await client("rafael@vitta.example");
const pedro = await client("pedro@semconta.example");
const anon = await client(null);
const subs = [
  await listen("Marina (controle)", marina, `workspace:${MIOLO}`, true),
  await listen("Rafael privado", rafael, `workspace:${MIOLO}`, true),
  await listen("Rafael público mesmo nome (cliente próprio)", await client("rafael@vitta.example"), `workspace:${MIOLO}`, false),
  await listen("Rafael no próprio (controle)", rafael, `workspace:${VITTA}`, true),
  await listen("Pedro privado", pedro, `workspace:${MIOLO}`, true),
  await listen("anônimo privado", anon, `workspace:${MIOLO}`, true),
  await listen("anônimo público (cliente próprio)", await client(null), `workspace:${MIOLO}`, false),
];
await sleep(1000);
const psql = (sql) => execFileSync("docker", ["exec", "-i", "supabase_db_hellosquad", "psql", "-U", "postgres", "-d", "postgres", "-qAt", "-c", sql]).toString().trim();
psql(`select app.broadcast_to_workspace('${MIOLO}', 'h1.sonda.miolo', '{"sonda": "miolo"}'::jsonb)`);
psql(`select app.broadcast_to_workspace('${VITTA}', 'h1.sonda.vitta', '{"sonda": "vitta"}'::jsonb)`);
await sleep(4000);
let leak = false;
for (const s of subs) {
  const own = s.label.includes("controle");
  if (!own && s.got.length) leak = true;
  console.log(`${s.label} | ${s.topic} | privado=${s.private} | status=${s.status} | recebeu=${JSON.stringify(s.got)}`);
}
const ctrl = subs[0].got.includes("h1.sonda.miolo") && subs[3].got.includes("h1.sonda.vitta") && !subs[3].got.includes("h1.sonda.miolo");
console.log(`RESULTADO: vazamento=${leak}; controles recebem só o próprio=${ctrl}`);
for (const c of [marina, rafael, pedro, anon]) await c.removeAllChannels();
process.exit(leak || !ctrl ? 1 : 0);
