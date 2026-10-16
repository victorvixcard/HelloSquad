// H2 estático P2: toda URL citada no <head> (og:image, twitter:image, canonical, hreflang) e no JSON-LD das páginas do
// sitemap responde 200 na 3198 (host reescrito)? Rodar dentro de p2_com_servidor.sh. Saída: /tmp/h2_est_p2_urls.json
import fs from "node:fs";
const BASE = process.env.BASE ?? "http://127.0.0.1:3198";
const local = (u) => { const x = new URL(u); return `${BASE}${x.pathname}${x.search}`; };
const sm = await (await fetch(`${BASE}/sitemap.xml`)).text();
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const urls = new Map(); // url -> {origem:Set}
const add = (u, o) => { if (!/^https?:\/\//.test(u) || /schema\.org/.test(u)) return; const k = u.split("#")[0]; if (!urls.has(k)) urls.set(k, new Set()); urls.get(k).add(o); };
for (const loc of locs) {
  const html = await (await fetch(local(loc))).text();
  for (const m of html.matchAll(/<meta\b[^>]*(?:property|name)="(og:image|twitter:image|og:url)"[^>]*content="([^"]+)"/g)) add(m[2].replace(/&amp;/g, "&"), m[1]);
  for (const m of html.matchAll(/<link\b[^>]*rel="(canonical|alternate)"[^>]*href="([^"]+)"/g)) add(m[2], m[1]);
  for (const m of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    const walk = (n) => { if (typeof n === "string") add(n, "jsonld"); else if (n && typeof n === "object") Object.values(n).forEach(walk); };
    walk(JSON.parse(m[1]));
  }
}
const out = [];
for (const [u, o] of urls) { const r = await fetch(local(u), { redirect: "manual" }); await r.arrayBuffer(); out.push({ u: new URL(u).pathname, host: new URL(u).origin, status: r.status, tipo: r.headers.get("content-type"), origem: [...o].join(",") }); }
fs.writeFileSync("/tmp/h2_est_p2_urls.json", JSON.stringify(out, null, 1));
const by = (f) => out.reduce((a, x) => ((a[f(x)] = (a[f(x)] ?? 0) + 1), a), {});
console.log("URLs únicas citadas:", out.length, "| por status:", JSON.stringify(by((x) => x.status)), "| por host:", JSON.stringify(by((x) => x.host)));
console.log("por origem:", JSON.stringify(by((x) => x.origem)), "| imagens:", JSON.stringify(by((x) => (/image/.test(x.tipo ?? "") ? x.tipo : "nao-imagem"))));
for (const x of out.filter((x) => x.status !== 200)) console.log("  NAO-200:", JSON.stringify(x));
