// H1 alvo 3 — escrita no canal: Rafael (outro tenant) e Marina (membro) tentam injetar um evento falso no canal
// privado da Miolo pela REST de broadcast e pelo websocket; Marina escuta. Prova = o que o ouvinte recebe.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire("/home/vitao/projetos/hellosquad/apps/web/package.json");
const { createClient } = require("@supabase/supabase-js");
const env = Object.fromEntries(readFileSync("/home/vitao/projetos/hellosquad/.env", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const URL = env.SUPABASE_URL, PK = env.SUPABASE_PUBLISHABLE_KEY, MIOLO = "6bcdc5bd-3c9a-4a7a-bb83-22b2ba88edc2";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function client(email) {
  const c = createClient(URL, PK, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await c.auth.signInWithPassword({ email, password: "Senha!Teste123" });
  await c.realtime.setAuth(data.session.access_token);
  return { c, token: data.session.access_token };
}
const listener = await client("marina@miolo.example");
const got = [];
const ch = listener.c.channel(`workspace:${MIOLO}`, { config: { private: true } });
ch.on("broadcast", { event: "*" }, (m) => got.push(`${m.event}:${JSON.stringify(m.payload)}`));
await new Promise((r) => ch.subscribe((s) => s === "SUBSCRIBED" && r()));
const out = [];
for (const email of ["rafael@vitta.example", "marina@miolo.example"]) {
  const { token, c } = await client(email);
  const r = await fetch(`${URL}/realtime/v1/api/broadcast`, { method: "POST", headers: { apikey: PK, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ topic: `workspace:${MIOLO}`, event: "approval.decided", payload: { falso: email }, private: true }] }) });
  out.push(`REST ${email}: HTTP ${r.status}`);
  const w = c.channel(`workspace:${MIOLO}`, { config: { private: true } });
  const st = await new Promise((res) => { w.subscribe((s) => s !== "JOINING" && res(s)); setTimeout(() => res("timeout"), 5000); });
  const sent = st === "SUBSCRIBED" ? await w.send({ type: "broadcast", event: "approval.decided", payload: { falso_ws: email } }) : "não entrou";
  out.push(`websocket ${email}: canal=${st} envio=${sent}`);
}
await sleep(3000);
console.log(out.join("\n"));
console.log(`Marina recebeu: ${JSON.stringify(got)}`);
process.exit(0);
