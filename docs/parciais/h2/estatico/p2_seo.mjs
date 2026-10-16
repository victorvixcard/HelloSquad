// H2 estático P2: percorre o sitemap.xml do `next start` da 3198 (rodar dentro de p2_com_servidor.sh) e confere, por página:
// status, <html lang>, hreflang (pt-BR/en/es/x-default, reciprocidade, alternativas 200), canônico, meta robots,
// JSON-LD (parse, @context, @type, campo vazio, offers/price, idioma), termos de preço e de fornecedor no HTML.
// Também confere robots.txt e llms.txt. Uso: node docs/parciais/h2/estatico/p2_seo.mjs
// Saída completa: /tmp/h2_est_p2_seo.json; no terminal só o resumo e os defeitos.
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://127.0.0.1:3198";
const OUT = "/tmp/h2_est_p2_seo.json";
const R = { base: BASE, quando: new Date().toISOString(), paginas: [], defeitos: [], observacoes: [] };
const def = (rota, tipo, detalhe) => R.defeitos.push({ rota, tipo, detalhe });
const obs = (rota, tipo, detalhe) => R.observacoes.push({ rota, tipo, detalhe });

const ent = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
const attrs = (tag) => { const o = {}; for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) o[m[1].toLowerCase()] = ent(m[2] ?? m[3] ?? ""); return o; };
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((m) => attrs(m[0]));
const toLocal = (u) => { try { const x = new URL(u); return `${BASE}${x.pathname}${x.search}`; } catch { return null; } };
const pathOf = (u) => { try { return new URL(u).pathname; } catch { return u; } };
const hostOf = (u) => { try { return new URL(u).origin; } catch { return null; } };
const langOfPath = (p) => (p === "/en" || p.startsWith("/en/") ? "en" : p === "/es" || p.startsWith("/es/") ? "es" : "pt-BR");

const cache = new Map();
async function get(url) {
  if (cache.has(url)) return cache.get(url);
  const r = await fetch(url, { redirect: "manual", headers: { "user-agent": "Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)" } });
  const v = { status: r.status, headers: Object.fromEntries(r.headers), text: await r.text() };
  cache.set(url, v);
  return v;
}

function visibleText(html) {
  return ent(html.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
}
const ctx = (s, i, n = 60) => s.slice(Math.max(0, i - n), i + n).replace(/\s+/g, " ");
function findAll(re, s, n = 60) { const out = []; for (const m of s.matchAll(re)) { out.push(ctx(s, m.index, n)); if (out.length >= 8) break; } return out; }

// fornecedores (palavra inteira, sem diferenciar maiúsculas); "GPTBot"/"ClaudeBot"/"anthropic-ai" tratados à parte
const VENDOR = /\b(anthropic|claude|openai|gpt(?:-?\d[\w.-]*)?|chatgpt|supabase|vercel|railway|asaas|mercado ?pago|stripe|mailpit|next\.?js|fastapi|postgres(?:ql)?|python|react|gemini|llama|mistral|langchain|redis|docker|tailwind|shadcn|node\.js|typescript|sentry|resend|cloudflare|netlify|midjourney|dall-?e|flux)\b/gi;
const PRICE = /(pre[çc]os?\b|precios?\b|\bprices?\b|\bpricing\b|\bplanos?\b|\bplans?\b|\bplanes\b|paywall|assinatura|subscription|suscripci[oó]n|R\$|US\$|\$\s?\d|€\s?\d|gr[áa]tis|gratuito|gratuita|\bfree\b|free trial|teste gr[áa]tis|prueba gratis|\bcr[ée]ditos?\b|\bcredits?\b|checkout|mensalidade|\/m[eê]s\b|per month|al mes)/gi;
const PRICE_LINK = /\/(precos|pricing|precios|planos|plans|planes|assinatura|checkout|subscribe)\b/i;
const PT_WORDS = /(\bvocê\b|\bvocês\b|\bnão\b|\bseu\b|\bsua\b|\bseus\b|\bsuas\b|ção\b|ções\b|[ãõ])/gi;
const ES_WORDS = /(\busted\b|\bnuestro\b|\bnuestra\b|\btambién\b|ción\b|ciones\b|ñ)/gi;

function walk(node, path, fn) {
  fn(node, path);
  if (Array.isArray(node)) node.forEach((v, i) => walk(v, `${path}[${i}]`, fn));
  else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`, fn);
}
function typesOf(doc) { const t = []; walk(doc, "$", (n) => { if (n && typeof n === "object" && !Array.isArray(n) && n["@type"]) [].concat(n["@type"]).forEach((x) => t.push(x)); }); return t; }

// ---------- sitemap ----------
const sm = await get(`${BASE}/sitemap.xml`);
const locs = [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => ent(m[1].trim()));
const smAlts = [...sm.text.matchAll(/<xhtml:link\b[^>]*>/g)].map((m) => attrs(m[0]));
R.sitemap = { status: sm.status, total: locs.length, hosts: [...new Set(locs.map(hostOf))], alternatesNoSitemap: smAlts.length, locs: locs.map(pathOf) };
for (const l of locs) if (/^\/(app|admin|precos|pricing|precios|sair)(\/|$)|\/(en|es)\/(app|admin|pricing|precios)/.test(pathOf(l))) def(pathOf(l), "sitemap", `URL proibida no sitemap: ${l}`);

const typeCount = {};
let hreflangPairs = 0, hreflangPairsOk = 0, ldBlocks = 0;
const pages = new Map();
for (const loc of locs) {
  const url = toLocal(loc), rota = pathOf(loc);
  const r = await get(url);
  const html = r.text;
  const P = { rota, status: r.status, xrt: r.headers["x-robots-tag"] ?? null };
  P.lang = (html.match(/<html\b[^>]*\blang="([^"]+)"/i) ?? [])[1] ?? null;
  P.langEsperado = langOfPath(rota);
  if (r.status !== 200) def(rota, "status", `sitemap aponta para status ${r.status}`);
  if (P.lang !== P.langEsperado) def(rota, "html-lang", `<html lang="${P.lang}">, esperado ${P.langEsperado}`);
  const links = tags(html, "link");
  P.canonical = links.find((l) => (l.rel ?? "").toLowerCase() === "canonical")?.href ?? null;
  P.hreflang = Object.fromEntries(links.filter((l) => (l.rel ?? "").toLowerCase() === "alternate" && l.hreflang).map((l) => [l.hreflang, l.href]));
  P.robotsMeta = tags(html, "meta").filter((m) => (m.name ?? "").toLowerCase() === "robots").map((m) => m.content);
  P.title = ent((html.match(/<title>([^<]*)<\/title>/i) ?? [])[1] ?? "");
  P.description = tags(html, "meta").find((m) => (m.name ?? "").toLowerCase() === "description")?.content ?? null;
  P.ogImage = tags(html, "meta").find((m) => (m.property ?? "") === "og:image")?.content ?? null;
  P.hosts = { canonical: hostOf(P.canonical), hreflang: [...new Set(Object.values(P.hreflang).map(hostOf))] };
  if (!P.canonical) def(rota, "canonico", "sem <link rel=canonical>");
  else if (pathOf(P.canonical) !== rota) def(rota, "canonico", `canônico ${P.canonical} difere da URL do sitemap ${loc}`);
  if (P.robotsMeta.some((c) => /noindex/i.test(c)) || /noindex/i.test(P.xrt ?? "")) def(rota, "noindex", `página do sitemap com noindex: ${JSON.stringify(P.robotsMeta)} ${P.xrt}`);
  if (!P.description) def(rota, "description", "sem meta description");
  const need = ["pt-BR", "en", "es", "x-default"];
  const miss = need.filter((k) => !P.hreflang[k]);
  if (miss.length) (rota === "/criar-conta" ? obs : def)(rota, "hreflang", `faltam ${miss.join(",")} (tem ${Object.keys(P.hreflang).join(",") || "nenhum"})`);
  for (const [k, v] of Object.entries(P.hreflang)) {
    if (k !== "x-default" && langOfPath(pathOf(v)) !== k) def(rota, "hreflang", `hreflang ${k} aponta para ${pathOf(v)} (prefixo de outro idioma)`);
  }
  if (P.hreflang["x-default"] && P.hreflang["pt-BR"] && P.hreflang["x-default"] !== P.hreflang["pt-BR"]) obs(rota, "x-default", `x-default ${P.hreflang["x-default"]} != pt-BR ${P.hreflang["pt-BR"]}`);
  if (P.hreflang[P.langEsperado] && pathOf(P.hreflang[P.langEsperado]) !== rota) def(rota, "hreflang", `auto-referência ${P.langEsperado} aponta para ${P.hreflang[P.langEsperado]}`);

  // JSON-LD
  P.jsonld = [];
  for (const m of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    ldBlocks++;
    const B = { ok: false };
    let doc;
    try { doc = JSON.parse(m[1]); B.ok = true; } catch (e) { def(rota, "jsonld-parse", String(e).slice(0, 120)); P.jsonld.push(B); continue; }
    const ctxs = [].concat(doc["@context"] ?? []);
    B.context = ctxs;
    if (!ctxs.some((c) => /^https?:\/\/schema\.org\/?$/.test(String(c)))) def(rota, "jsonld-context", `@context ${JSON.stringify(doc["@context"])}`);
    B.types = typesOf(doc);
    B.types.forEach((t) => (typeCount[t] = (typeCount[t] ?? 0) + 1));
    const vazios = [], precos = [], ptHits = [], esHits = [], inLang = [], urls = new Set();
    walk(doc, "$", (n, p) => {
      if (n === null || (typeof n === "string" && n.trim() === "") || (Array.isArray(n) && n.length === 0) || (n && typeof n === "object" && !Array.isArray(n) && Object.keys(n).length === 0)) vazios.push(p);
      if (n && typeof n === "object" && !Array.isArray(n)) {
        for (const k of Object.keys(n)) if (/^(offers|price|priceCurrency|priceSpecification|lowPrice|highPrice)$/i.test(k)) precos.push(`${p}.${k}`);
        if ([].concat(n["@type"] ?? []).some((t) => /Offer/i.test(t))) precos.push(`${p} @type ${n["@type"]}`);
        if (n.inLanguage !== undefined) inLang.push(`${[].concat(n["@type"] ?? "?").join("/")}:${JSON.stringify(n.inLanguage)}`);
      }
      if (typeof n === "string") {
        if (/^https?:\/\//.test(n)) { urls.add(hostOf(n)); return; }
        if (P.langEsperado !== "pt-BR") for (const h of n.matchAll(PT_WORDS)) ptHits.push(`${p}: …${ctx(n, h.index, 40)}…`);
        if (P.langEsperado === "en") for (const h of n.matchAll(ES_WORDS)) esHits.push(`${p}: …${ctx(n, h.index, 40)}…`);
      }
    });
    B.vazios = vazios; B.precos = precos; B.inLanguage = inLang; B.hostsUrl = [...urls];
    B.ptEmPaginaNaoPt = ptHits.slice(0, 5); B.esEmPaginaEn = esHits.slice(0, 5);
    if (vazios.length) def(rota, "jsonld-vazio", vazios.slice(0, 6).join(", "));
    if (precos.length) def(rota, "jsonld-preco", precos.join(", "));
    if (ptHits.length) def(rota, "jsonld-idioma", `${ptHits.length} trecho(s) com cara de pt-BR: ${ptHits.slice(0, 3).join(" | ")}`);
    if (esHits.length) def(rota, "jsonld-idioma", `${esHits.length} trecho(s) com cara de es em página en: ${esHits.slice(0, 3).join(" | ")}`);
    const badLang = inLang.filter((x) => !/\[/.test(x) && !x.includes(`"${P.langEsperado}"`));
    if (badLang.length) def(rota, "jsonld-inLanguage", badLang.join(", "));
    P.jsonld.push(B);
    B._doc = doc;
  }
  const allTypes = P.jsonld.flatMap((b) => b.types ?? []);
  P.tipos = [...new Set(allTypes)];
  const exp = ["Organization"];
  if (rota !== "/" && rota !== "/en" && rota !== "/es" && rota !== "/criar-conta") exp.push("BreadcrumbList");
  if (/\/(faq|preguntas-frecuentes)$/.test(rota)) exp.push("FAQPage");
  if (/\/squad\/[^/]+$/.test(rota)) exp.push("Service");
  if (/^\/((en|es)\/)?squad$/.test(rota)) exp.push("ItemList");
  if (/\/(sobre|about)$/.test(rota)) exp.push("AboutPage");
  const faltaTipo = exp.filter((t) => !allTypes.includes(t));
  if (faltaTipo.length) (rota === "/criar-conta" ? obs : def)(rota, "jsonld-tipos", `faltam @type ${faltaTipo.join(",")} (tem ${P.tipos.join(",") || "nenhum"})`);
  if (!P.jsonld.length) (rota === "/criar-conta" ? obs : def)(rota, "jsonld", "sem bloco JSON-LD");

  // preço e fornecedor no HTML
  const vis = visibleText(html);
  const metaTxt = tags(html, "meta").map((m) => m.content ?? "").join(" | ");
  const attrTxt = [...html.matchAll(/\b(?:alt|title|aria-label|placeholder)="([^"]*)"/gi)].map((m) => ent(m[1])).join(" | ");
  const ldTxt = P.jsonld.map((b) => JSON.stringify(b._doc ?? {})).join(" ");
  P.preco = { visivel: findAll(PRICE, vis), meta: findAll(PRICE, metaTxt), atributos: findAll(PRICE, attrTxt) };
  P.linksPreco = tags(html, "a").map((a) => a.href).filter((h) => h && PRICE_LINK.test(h));
  if (P.linksPreco.length) def(rota, "link-preco", P.linksPreco.join(", "));
  const vendorIn = (s) => findAll(VENDOR, s.replace(/\/_next\/[^\s"')]+/g, ""));
  P.fornecedor = { visivel: vendorIn(vis), meta: vendorIn(metaTxt), atributos: vendorIn(attrTxt), jsonld: vendorIn(ldTxt) };
  const rawNoNext = html.replace(/\/_next\/[^\s"')\\]+/g, "");
  P.fornecedorHtmlBruto = [...new Set([...rawNoNext.matchAll(VENDOR)].map((m) => m[0].toLowerCase()))];
  for (const [onde, hits] of Object.entries(P.fornecedor)) if (hits.length) def(rota, "fornecedor", `${onde}: ${hits.slice(0, 3).join(" | ")}`);
  // texto visível com cara de pt-BR em página en/es (só registro; o seletor de idioma tem "Português")
  if (P.langEsperado !== "pt-BR") P.ptNoVisivel = findAll(PT_WORDS, vis, 40);
  pages.set(rota, P);
  R.paginas.push(P);
}

// reciprocidade: para cada página A e cada alternativa B (≠ A), B precisa estar no ar (200) e apontar de volta para A
for (const [rota, P] of pages) {
  for (const [k, v] of Object.entries(P.hreflang)) {
    const bPath = pathOf(v);
    if (bPath === rota) continue;
    hreflangPairs++;
    const B = pages.get(bPath) ?? null;
    let bStatus = B?.status, bAlt = B?.hreflang;
    if (!B) {
      const r = await get(toLocal(v));
      bStatus = r.status;
      bAlt = Object.fromEntries(tags(r.text, "link").filter((l) => (l.rel ?? "").toLowerCase() === "alternate" && l.hreflang).map((l) => [l.hreflang, l.href]));
      obs(rota, "hreflang-fora-do-sitemap", `${k} -> ${bPath} não está no sitemap (status ${bStatus})`);
    }
    if (bStatus !== 200) { def(rota, "hreflang-alvo", `${k} -> ${bPath} responde ${bStatus}`); continue; }
    const volta = Object.entries(bAlt ?? {}).filter(([, u]) => pathOf(u) === rota).map(([kk]) => kk);
    if (!volta.length) def(rota, "hreflang-reciproco", `${k} -> ${bPath}, mas ${bPath} não aponta de volta para ${rota}`);
    else if (JSON.stringify(Object.fromEntries(Object.entries(bAlt).map(([a, u]) => [a, pathOf(u)]))) !== JSON.stringify(Object.fromEntries(Object.entries(P.hreflang).map(([a, u]) => [a, pathOf(u)]))))
      def(rota, "hreflang-grupo", `grupo de ${rota} difere do grupo de ${bPath}`);
    else hreflangPairsOk++;
  }
}

// robots.txt e llms.txt
const rb = await get(`${BASE}/robots.txt`), ll = await get(`${BASE}/llms.txt`);
const rbBots = [...rb.text.matchAll(/^user-agent:\s*(.+)$/gim)].map((m) => m[1].trim());
const rbVendorFora = rb.text.split("\n").filter((l) => !/^\s*user-agent:/i.test(l)).join("\n");
R.robots = { status: rb.status, bytes: rb.text.length, userAgents: rbBots, disallow: [...new Set([...rb.text.matchAll(/^disallow:\s*(.*)$/gim)].map((m) => m[1].trim()))],
  allow: [...new Set([...rb.text.matchAll(/^allow:\s*(.*)$/gim)].map((m) => m[1].trim()))], sitemap: [...rb.text.matchAll(/^sitemap:\s*(.*)$/gim)].map((m) => m[1].trim()),
  fornecedorForaDeUserAgent: findAll(VENDOR, rbVendorFora), ordemPrimeiroBloco: rb.text.split("\n").slice(0, 8) };
const llHosts = [...new Set([...ll.text.matchAll(/https?:\/\/[^\s)>\]]+/g)].map((m) => hostOf(m[0])))];
const llLinks = [...new Set([...ll.text.matchAll(/https?:\/\/[^\s)>\]]+/g)].map((m) => m[0].replace(/[.,;]+$/, "")))];
R.llms = { status: ll.status, bytes: ll.text.length, hosts: llHosts, links: llLinks.length, fornecedor: findAll(VENDOR, ll.text), preco: findAll(PRICE, ll.text) };
R.llms.linksStatus = {};
for (const u of llLinks) { const lu = toLocal(u); if (!lu) continue; const r = await get(lu); R.llms.linksStatus[pathOf(u)] = r.status; if (r.status !== 200) def("/llms.txt", "llms-link", `${u} -> ${r.status}`); }
const llPaths = new Set(Object.keys(R.llms.linksStatus));
R.llms.sitemapForaDoLlms = R.sitemap.locs.filter((p) => !llPaths.has(p));
if (R.llms.fornecedor.length) def("/llms.txt", "fornecedor", R.llms.fornecedor.join(" | "));
if (R.robots.fornecedorForaDeUserAgent.length) def("/robots.txt", "fornecedor", R.robots.fornecedorForaDeUserAgent.join(" | "));
for (const p of ["/app", "/admin"]) if (!R.robots.disallow.includes(p)) def("/robots.txt", "robots", `sem Disallow: ${p}`);

for (const P of R.paginas) for (const b of P.jsonld) delete b._doc;
R.contagens = { urlsSitemap: locs.length, status200: R.paginas.filter((p) => p.status === 200).length, hreflangPares: hreflangPairs, hreflangParesOk: hreflangPairsOk, blocosJsonLd: ldBlocks, tipos: typeCount,
  hostsSitemap: R.sitemap.hosts, hostsCanonico: [...new Set(R.paginas.map((p) => p.hosts.canonical))], hostsHreflang: [...new Set(R.paginas.flatMap((p) => p.hosts.hreflang))],
  hostsJsonLd: [...new Set(R.paginas.flatMap((p) => p.jsonld.flatMap((b) => b.hostsUrl ?? [])))] };
fs.writeFileSync(OUT, JSON.stringify(R, null, 1));

console.log("sitemap:", JSON.stringify({ status: R.sitemap.status, total: R.sitemap.total, hosts: R.sitemap.hosts, alternatesNoSitemap: R.sitemap.alternatesNoSitemap }));
for (const P of R.paginas) console.log(`${P.rota.padEnd(30)} ${P.status} lang=${P.lang} canon=${pathOf(P.canonical ?? "-")} hreflang=${Object.keys(P.hreflang).length} ld=${P.jsonld.length}[${P.tipos.join(",")}] precoVis=${P.preco.visivel.length} fornVis=${P.fornecedor.visivel.length} bruto=${P.fornecedorHtmlBruto.join("/") || "-"}`);
console.log("contagens:", JSON.stringify(R.contagens));
console.log("robots:", JSON.stringify({ ...R.robots, ordemPrimeiroBloco: undefined }));
console.log("robots início:", JSON.stringify(R.robots.ordemPrimeiroBloco));
console.log("llms:", JSON.stringify({ ...R.llms, linksStatus: undefined }));
console.log(`DEFEITOS (${R.defeitos.length}):`); for (const d of R.defeitos) console.log("  ", JSON.stringify(d).slice(0, 400));
console.log(`OBSERVACOES (${R.observacoes.length}):`); for (const d of R.observacoes) console.log("  ", JSON.stringify(d).slice(0, 300));
