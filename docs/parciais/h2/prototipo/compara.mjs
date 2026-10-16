// H2 · diferença de rótulos entre o protótipo e o nosso, por tela (só candidatos; cada um é conferido à mão).
// Uso: node compara.mjs /tmp/h2_proto_proto_<cenário>.json /tmp/h2_proto_nosso_<cenário>.json [tela...]
import fs from "node:fs";
const [a, b, ...only] = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync(a, "utf8"));
const N = JSON.parse(fs.readFileSync(b, "utf8"));
const norm = (s) => s.replace(/\d+([.,]\d+)?/g, "#").replace(/\s+/g, " ").trim();
for (const k of Object.keys(P)) {
  if (only.length && !only.includes(k)) continue;
  const p = P[k] || {}, n = N[k] || {};
  console.log(`\n######## ${k}`);
  for (const f of ["heads", "buttons", "regions", "inputs"]) {
    const ps = new Set((p[f] || []).map(norm)), ns = new Set((n[f] || []).map(norm));
    const po = [...ps].filter((x) => !ns.has(x)), no = [...ns].filter((x) => !ps.has(x));
    if (po.length) console.log(`  [${f}] só no protótipo: ` + po.slice(0, 60).join(" ‖ "));
    if (no.length) console.log(`  [${f}] só no nosso:     ` + no.slice(0, 60).join(" ‖ "));
  }
}
