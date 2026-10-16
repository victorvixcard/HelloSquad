// S1a — prova ponta a ponta do canal privado workspace:<id> no Realtime local.
// Marina (Miolo) e Rafael (Vitta) entram no canal da Miolo com private: true; o banco grava um
// run_event e o trigger publica. Esperado: Marina recebe; Rafael é recusado na entrada do canal.
// Uso (raiz do repo, Supabase local no ar, .env preenchido):
//   node --env-file=.env docs/parciais/s1a/realtime_e2e.mjs
// Grava um run de teste na Miolo e o apaga no fim; `make seed` devolve o estado documentado.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY precisam estar no .env");
const password = "Senha!Teste123"; // senha fictícia, só local (docs/DADOS_FICTICIOS.md)

const psql = (sql) =>
  execFileSync("docker", ["exec", "-i", "supabase_db_hellosquad", "psql", "-U", "postgres", "-Atq", "-c", sql], {
    encoding: "utf8",
  }).trim();

async function join(email, topic) {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await client.realtime.setAuth(data.session.access_token);
  const received = [];
  const channel = client.channel(topic, { config: { private: true } });
  channel.on("broadcast", { event: "run_event" }, (msg) => received.push(msg.payload));
  const status = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve("TIMED_OUT"), 8000);
    channel.subscribe((s, err) => {
      if (s === "SUBSCRIBED" || s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
        clearTimeout(timer);
        resolve(err ? `${s}: ${err.message}` : s);
      }
    });
  });
  return { email, client, channel, status, received };
}

const miolo = psql("select id from public.workspaces where slug = 'miolo'");
const topic = `workspace:${miolo}`;
const listeners = [await join("marina@miolo.example", topic), await join("rafael@vitta.example", topic)];

const runId = psql(
  `insert into public.runs (workspace_id, agent_id, idempotency_key) values ('${miolo}', 'otto', 'e2e-realtime-' || gen_random_uuid()) returning id`,
);
psql(
  `insert into public.run_events (workspace_id, run_id, seq, type, payload) values ('${miolo}', '${runId}', 1, 'run.progress', '{"etapa": "escrevendo"}')`,
);
await new Promise((r) => setTimeout(r, 3000));
psql(`delete from public.runs where id = '${runId}'`);

for (const l of listeners) {
  const got = l.received.filter((p) => p.run_id === runId).map((p) => p.type);
  console.log(`${l.email}: entrada no canal = ${l.status}; run_event recebido = ${JSON.stringify(got)}`);
  await l.client.removeAllChannels();
}
process.exit(0);
