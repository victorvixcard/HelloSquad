// Lista as strings visíveis da Landing R32 portada (texto do template, rótulos acessíveis, textos dos componentes do DS e
// os textos dos roteiros da classe Component) em content/landing/pt-BR.json. en.json e es.json traduzem por índice
// dessa lista (chave numérica) e, para conectivos soltos entre negritos, pela própria string ("e").
// Uso: node apps/web/scripts/landing-strings.mjs [--check]. O teste landing-i18n.test.ts falha se a lista ficar defasada.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const OUT = path.resolve(here, "../content/landing/pt-BR.json");

export function landingStrings() {
  const tplSrc = readFileSync(path.join(root, "packages/ui/src/generated/landing-template.ts"), "utf8");
  const tpl = JSON.parse(tplSrc.slice(tplSrc.indexOf("= [") + 2, tplSrc.lastIndexOf("];") + 1));
  const out = new Set();
  const TR = new Set(["aria-label", "title", "placeholder", "alt", "label"]);
  const add = (s) => {
    s = s.replace(/\s+/g, " ").trim();
    if (s && /[A-Za-zÀ-ú]{2}/.test(s)) out.add(s);
  };
  (function walk(nodes) {
    for (const n of nodes) {
      if (typeof n === "string") {
        for (const part of n.split(/\{\{[\s\S]+?\}\}/g)) add(part);
        continue;
      }
      if (n.t === "el") for (const [k, v] of n.p) if (TR.has(k) && typeof v === "string" && !v.includes("{{")) add(v);
      if (n.t === "x")
        for (const [k, v] of n.p)
          if (typeof v === "string" && !v.includes("{{") && !/^(agent|size|variant|expression|kind|state|icon|type|outline|name|minWidth|min-width)$/.test(k) && /[a-zà-ú] |[À-ú]/.test(v)) add(v);
      if (n.c) walk(n.c);
    }
  })(tpl);
  const logic = readFileSync(path.join(root, "packages/ui/src/generated/landing-logic.ts"), "utf8");
  const body = logic.slice(logic.indexOf("export function createLandingComponent"));
  for (const m of body.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) {
    const s = m[1];
    if (!/[a-zà-ú]/.test(s)) continue;
    if (/^[\w.#:\-[\]="' >*(),%]+$/.test(s) && !/ /.test(s) && !/[À-ú]/.test(s) && !/^[A-ZÀ-Ú][a-zà-ú]+$/.test(s)) continue;
    if (/^\.|lp-|hs-|sc-|:not\(|px\b|^#[0-9a-f]|var\(--|translate|rgba|cubic|^(ease|mola|linear)$|\{\{/.test(s)) continue;
    if (/^[a-z][a-zA-Z0-9]*$/.test(s)) continue;
    add(s.replace(/\\'/g, "'"));
  }
  const noise = (s) =>
    (/^(rotate|translate|scale|matrix)\(|\b(the|and|from|with|ported|board|each|only|one|step|opens|after|before|when|this|that|keep|first|back|then)\b/i.test(s) && !/[ãõçáéíóúâêô]/i.test(s)) ||
    /^[A-Z0-9_]+$/.test(s) || /^[\d\s.,:%xh+\-–·/]+$/.test(s) || s === "HelloSquad";
  return [...out].filter((s) => !noise(s));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const list = landingStrings();
  const json = JSON.stringify(list, null, 0).replace(/","/g, '",\n"') + "\n";
  if (process.argv.includes("--check")) {
    if (readFileSync(OUT, "utf8") !== json) { console.error("content/landing/pt-BR.json defasado: rode node apps/web/scripts/landing-strings.mjs"); process.exit(1); }
    console.log("pt-BR.json em dia");
  } else {
    writeFileSync(OUT, json);
    console.log(`gerado ${path.relative(root, OUT)} (${list.length} strings)`);
  }
}
