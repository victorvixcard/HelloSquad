// Porta a Landing Page V1 (R32) do handoff para src/generated/, sem redesenho, como a A1f fez com a Product UI:
//   - landing.css: o <style> do <helmet>, inteiro e na mesma ordem (só as famílias apontam para as fontes locais);
//   - landing-template.ts: o template do <x-dc> já analisado em árvore (o mesmo pré-processamento e as mesmas regras
//     de atributo do runtime do protótipo, support.js), para o interpretador em src/landing/runtime.tsx;
//   - landing-logic.ts: as constantes e a classe Component (motores do Hero, da demonstração, do squad, do Modo
//     Autônomo, da Memória, dos Resultados, do FAQ e do encerramento) como estão, só com o invólucro de módulo;
//   - ds-bundle-runtime.ts: o bundle.js do DS (HelloSquad.Button, Agent, CommandField…) como fábrica, sem window.React.
// Trocas mecânicas, todas listadas aqui: famílias Gabarito/JetBrains Mono → variáveis das fontes locais (CSS, estilos
// inline do template e a fonte da medição em canvas da classe); o <link> do Google Fonts some (fontes locais).
// Uso: pnpm --filter @hellosquad/ui extract:landing. O teste test/generated.test.ts falha se algo ficar defasado.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
export const LANDING = path.join(root, "design/handoff-v4.6/landing/LandingPageV1.dc.html");
export const DS_BUNDLE_JS = path.join(root, "design/handoff-v4.6/landing/ds/hellosquad/components/bundle.js");
const OUT = path.resolve(here, "../src/generated");
export const OUT_LANDING_CSS = path.join(OUT, "landing.css");
export const OUT_LANDING_TEMPLATE = path.join(OUT, "landing-template.ts");
export const OUT_LANDING_LOGIC = path.join(OUT, "landing-logic.ts");
export const OUT_DS_RUNTIME = path.join(OUT, "ds-bundle-runtime.ts");

// Nenhum fornecedor citado no texto público (briefing da L1; mesma regra do teste da A2c, site-seo.test.ts). A R32 cita
// redes, buscador e duas marcas no comparativo; cada troca abaixo é exata, conta as ocorrências e falha se o protótipo
// mudar. Os logotipos do comparativo saem, mas a caixa de 56 px fica (o desenho da tabela não muda). Lista no L1-relatorio.
type Neutral = [where: "tpl" | "logic", from: string, to: string, count: number];
export const NEUTRAL: Neutral[] = [
  ["tpl", "Peças · Instagram e Facebook", "Peças · redes sociais", 1],
  ["tpl", "Publicar 3x por semana no Instagram.", "Publicar 3x por semana nas redes sociais.", 2],
  ["tpl", "Posts no Instagram", "Posts nas redes sociais", 1],
  ["tpl", ' data-brand="canva" role="img" aria-label="Canva"', ' aria-hidden="true"', 1],
  ["tpl", ' data-brand="chatgpt" role="img" aria-label="ChatGPT"', ' aria-hidden="true"', 1],
  ["logic", "'Instagram, Facebook e Google Ads'", "'Redes sociais e anúncios de busca'", 2],
  ["logic", "'Google Ads e Instagram'", "'Anúncios de busca e redes sociais'", 2],
  ["logic", "Três peças para Instagram e Facebook, com textos do Otto.", "Três peças para as redes sociais, com textos do Otto.", 1],
  ["logic", "anúncios no Google Ads e no Instagram", "anúncios de busca e nas redes sociais", 1],
  ["logic", "'Instagram e indicação de alunos'", "'Redes sociais e indicação de alunos'", 1],
  ["logic", "aplicações em rótulo e Instagram", "aplicações em rótulo e redes sociais", 1],
  ["logic", "61% vieram do Instagram, 27% do Google e 12% de acesso direto. O crescimento veio principalmente do Instagram.", "61% vieram das redes sociais, 27% da busca e 12% de acesso direto. O crescimento veio principalmente das redes sociais.", 1],
  ["logic", "'Perfil no Google com avaliações recentes'", "'Perfil na busca com avaliações recentes'", 1],
  ["logic", "c: 'Instagram e Facebook' }", "c: 'Redes sociais' }", 1],
  ["logic", "c: 'Instagram' }", "c: 'Redes sociais' }", 3],
  ["logic", "'Instagram e Google'", "'Redes sociais e busca'", 1],
  ["logic", "'Publicar 3x por semana no Instagram.'", "'Publicar 3x por semana nas redes sociais.'", 1],
  ["logic", "publicar 3x por semana no Instagram, segunda", "publicar 3x por semana nas redes sociais, segunda", 1],
  ["logic", "['Onde', 'Instagram']", "['Onde', 'Redes sociais']", 1],
];
// As duas regras com os logotipos (PNG em base64) também saem do CSS: a marca não vai para o navegador.
const BRAND_CSS = /\.lp-c2-logo\[data-brand="(?:chatgpt|canva)"\] \.lp-c2-lm\{[^}]*\}\n?/g;

function neutral(src: string, where: Neutral[0]): string {
  let out = src;
  for (const [w, from, to, count] of NEUTRAL) {
    if (w !== where) continue;
    const n = out.split(from).length - 1;
    if (n !== count) throw new Error(`troca neutra "${from}": esperava ${count}, achei ${n}`);
    out = out.replaceAll(from, to);
  }
  return out;
}

const DISPLAY = "var(--hs-font-display)";
const MONO = "var(--hs-font-mono)";

function localFontsCss(css: string): string {
  return css
    .replaceAll("font-family:'Gabarito',sans-serif", `font-family:${DISPLAY}`)
    .replaceAll("font-family:'JetBrains Mono',monospace", `font-family:${MONO}`)
    .replaceAll(" 'Gabarito',sans-serif", ` ${DISPLAY}`)
    .replaceAll(" 'JetBrains Mono',monospace", ` ${MONO}`);
}

function localFontsInline(style: string): string {
  return style.replaceAll("font-family: Gabarito, sans-serif", `font-family: ${DISPLAY}`).replaceAll("font-family: 'JetBrains Mono', monospace", `font-family: ${MONO}`);
}

function section(html: string) {
  const helmetEnd = html.indexOf("</helmet>");
  const xdcEnd = html.indexOf("</x-dc>");
  const styleStart = html.indexOf("<style>");
  const styleEnd = html.indexOf("</style>", styleStart);
  const scriptTag = html.indexOf("<script type=\"text/x-dc\"");
  const scriptStart = html.indexOf(">", scriptTag) + 1;
  const scriptEnd = html.indexOf("</script>", scriptStart);
  if ([helmetEnd, xdcEnd, styleStart, styleEnd, scriptTag, scriptEnd].some((i) => i < 0)) throw new Error("LandingPageV1.dc.html fora do formato esperado");
  return {
    css: html.slice(styleStart + "<style>".length, styleEnd).trim(),
    template: html.slice(helmetEnd + "</helmet>".length, xdcEnd),
    script: html.slice(scriptStart, scriptEnd),
  };
}

export function buildLandingCss(html: string): string {
  const header = [
    "/* Gerado por packages/ui/scripts/extract-landing.ts a partir de landing/LandingPageV1.dc.html (<style> do <helmet>).",
    "   Não edite à mão: rode pnpm --filter @hellosquad/ui extract:landing.",
    "   As duas primeiras regras são as do runtime do protótipo (support.js) para a raiz #dc-root > .sc-host. */",
    "html,body{height:100%;margin:0}#dc-root,#dc-root>.sc-host{height:100%}",
    ":root{--e-saida:var(--hs-e-saida);--e-mola:var(--hs-e-mola);--e-precisa:var(--hs-e-precisa)}",
  ].join("\n");
  const css = section(html).css;
  const brands = css.match(BRAND_CSS)?.length ?? 0;
  if (brands !== 2) throw new Error(`regras de logotipo do comparativo: esperava 2, achei ${brands}`);
  return `${header}\n${localFontsCss(css.replace(BRAND_CSS, ""))}\n`;
}

// ---------------------------------------------------------------- template (mesmas regras do support.js)
const CAMEL = "sc-camel-";
const OPEN_IMPORT = /<(x-import|dc-import)((?:[^>"']|"[^"]*"|'[^']*')*)\/>/gi;
const TAG = /(<!---?>|<!--[\s\S]*?--!?>)|<[a-zA-Z][^\s/>]*(?=[\s/>])(?:=\s*"[^"]*"|=\s*'[^']*'|=(?!\s*["'])|[^>=])*>/gi;
const CAMEL_ATTR = /=\s*"[^"]*"|=\s*'[^']*'|(\s)([a-z]+[A-Z][A-Za-z0-9]*)(?=\s*=)/g;
const BOOL_ATTRS = new Set("allowFullScreen async autoFocus autoPlay checked controls default defer disabled formNoValidate hidden loop multiple muted noValidate open playsInline readOnly required reversed selected".split(" "));
const EVENTS: Record<string, string> = { onclick: "onClick", onchange: "onChange", oninput: "onInput", onsubmit: "onSubmit", onkeydown: "onKeyDown", onkeyup: "onKeyUp", onmouseenter: "onMouseEnter", onmouseleave: "onMouseLeave", onfocus: "onFocus", onblur: "onBlur", onpointerdown: "onPointerDown", onpointerup: "onPointerUp", onpointermove: "onPointerMove" };
// Nomes que o React escreve em camelCase (o DOM final é o mesmo: stroke-width, tabindex…); evita aviso de propriedade inválida.
const REACT_NAMES: Record<string, string> = {
  tabindex: "tabIndex", "text-anchor": "textAnchor", "stroke-width": "strokeWidth", "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin", "stroke-dasharray": "strokeDasharray", "stroke-dashoffset": "strokeDashoffset",
  "fill-rule": "fillRule", "clip-rule": "clipRule", "clip-path": "clipPath", "stop-color": "stopColor", "stop-opacity": "stopOpacity",
  "flood-color": "floodColor", "flood-opacity": "floodOpacity", "font-size": "fontSize", "font-family": "fontFamily",
  "font-weight": "fontWeight", "dominant-baseline": "dominantBaseline", "color-interpolation-filters": "colorInterpolationFilters",
  maxlength: "maxLength", readonly: "readOnly", spellcheck: "spellCheck", autocomplete: "autoComplete", inputmode: "inputMode",
  enterkeyhint: "enterKeyHint", colspan: "colSpan", rowspan: "rowSpan", crossorigin: "crossOrigin", srcset: "srcSet",
};
const kebabToCamel = (s: string) => s.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());

/** O mesmo pré-processamento do runtime: x-import autofechado vira par; atributo camelCase sobrevive ao parser de HTML. */
export function preprocessTemplate(t: string): string {
  const camel = (tag: string) => tag.replace(CAMEL_ATTR, (m, sp?: string, name?: string) => (name === undefined ? m : sp + CAMEL + name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())));
  let out = t.replace(OPEN_IMPORT, (_m, tag: string, attrs: string) => `<${tag}${attrs}></${tag}>`);
  out = out.replace(TAG, (m, comment?: string) => (comment !== undefined ? m : camel(m)));
  if (/<(table|tbody|thead|tr|td|th|select|caption)[\s>]/i.test(out)) throw new Error("template com tabela/select: portar o sc-raw-* do runtime");
  return out;
}

export type TplProp = [name: string, raw: string | true];
export type TplNode =
  | string
  | { t: "for"; list: string; as: string; c: TplNode[] }
  | { t: "if"; v: string; c: TplNode[] }
  | { t: "x"; n: string; p: TplProp[]; s: string | null; c: TplNode[] }
  | { t: "el"; tag: string; p: TplProp[]; c: TplNode[] };

function attrName(raw: string, ctx: "dom" | "x-import"): string {
  let f = raw.startsWith(CAMEL) ? kebabToCamel(raw.slice(CAMEL.length)) : raw;
  if (ctx === "x-import") {
    if (f.includes("-") && !f.startsWith("aria-") && !f.startsWith("data-")) f = kebabToCamel(f);
    return f;
  }
  if (f === "class") return "className";
  if (f === "for") return "htmlFor";
  if (f.startsWith("on")) return EVENTS[f.toLowerCase()] ?? "on" + f[2]!.toUpperCase() + f.slice(3);
  return REACT_NAMES[f] ?? f;
}

function walk(nodes: NodeListOf<ChildNode> | ChildNode[]): TplNode[] {
  const out: TplNode[] = [];
  for (const node of Array.from(nodes)) {
    if (node.nodeType === 3) {
      const v = node.nodeValue ?? "";
      if (!v.includes("{{") && !v.trim() && !v.includes(" ")) continue;
      out.push(v);
      continue;
    }
    if (node.nodeType !== 1) continue;
    const el = node as Element;
    const tag = el.localName;
    const kids = walk(el.childNodes);
    if (tag === "sc-for") out.push({ t: "for", list: el.getAttribute("list") ?? "", as: el.getAttribute("as") ?? "item", c: kids });
    else if (tag === "sc-if") out.push({ t: "if", v: el.getAttribute("value") ?? "", c: kids });
    else if (tag === "x-import") {
      const name = (el.getAttribute("component-from-global-scope") ?? "").replace(/^HelloSquad\./, "");
      const p: TplProp[] = [];
      for (const a of Array.from(el.attributes)) {
        if (["component-from-global-scope", "component", "from", "style", "hint-size"].includes(a.name)) continue;
        p.push([attrName(a.name, "x-import"), a.value]);
      }
      const hasKids = el.children.length > 0 || !!(el.textContent ?? "").trim();
      out.push({ t: "x", n: name, p, s: el.getAttribute("style"), c: hasKids ? kids : [] });
    } else if (tag === "sc-helmet" || tag === "dc-import") throw new Error(`${tag} inesperado no template`);
    else {
      const p: TplProp[] = [];
      for (const a of Array.from(el.attributes)) {
        const name = attrName(a.name, "dom");
        if (a.value === "" && BOOL_ATTRS.has(name)) p.push([name, true]);
        else p.push([name, name === "style" ? localFontsInline(a.value) : a.value]);
      }
      out.push({ t: "el", tag, p, c: kids });
    }
  }
  return out;
}

export function parseLandingTemplate(html: string): TplNode[] {
  const { window } = new JSDOM("<!doctype html><html><body></body></html>");
  const tpl = window.document.createElement("template");
  tpl.innerHTML = preprocessTemplate(neutral(section(html).template, "tpl"));
  return walk(tpl.content.childNodes);
}

export function buildLandingTemplate(html: string): string {
  return [
    "// Gerado por packages/ui/scripts/extract-landing.ts a partir de landing/LandingPageV1.dc.html (<x-dc>, sem o <helmet>).",
    "// Não edite à mão: rode pnpm --filter @hellosquad/ui extract:landing.",
    'import type { TplNode } from "../landing/template-types";',
    "",
    `export const LANDING_TEMPLATE: TplNode[] = ${JSON.stringify(parseLandingTemplate(html))};`,
    "",
  ].join("\n");
}

// ---------------------------------------------------------------- classe Component
const CANVAS_FONT = `" 15px Gabarito, 'Inter Display', Inter, sans-serif"`;

export function buildLandingLogic(html: string): string {
  const { script } = section(html);
  if (!script.includes("class Component extends DCLogic")) throw new Error("classe Component não encontrada");
  if (!script.includes(CANVAS_FONT)) throw new Error("fonte da medição em canvas mudou no protótipo");
  const body = neutral(script, "logic").replace(CANVAS_FONT, `" 15px " + __hsCanvasFont()`);
  return [
    "// @ts-nocheck",
    "/* eslint-disable */",
    "// Gerado por packages/ui/scripts/extract-landing.ts a partir de landing/LandingPageV1.dc.html (<script data-dc-script>).",
    "// Não edite à mão: rode pnpm --filter @hellosquad/ui extract:landing.",
    "// O código é o do protótipo; o invólucro dá a ele o que o runtime (support.js) dava: DCLogic, React, window e document.",
    "// Trocas: a fonte da medição de texto em canvas usa a Gabarito local (__hsCanvasFont), não o nome do Google Fonts;",
    "// e os nomes de fornecedor dos roteiros viram termos neutros (tabela NEUTRAL do script).",
    "export function createLandingComponent(DCLogic, React, window, document, __hsCanvasFont) {",
    body.trim(),
    "  return Component;",
    "}",
    "",
  ].join("\n");
}

// ---------------------------------------------------------------- bundle.js do DS
export function buildDsRuntime(js: string): string {
  const open = "(function () {\n  'use strict';\n  var React = window.React;";
  const close = "})();";
  const start = js.indexOf(open);
  const end = js.lastIndexOf(close);
  if (start < 0 || end < 0 || !js.includes("window.HelloSquad = {")) throw new Error("bundle.js do DS fora do formato esperado");
  const body = js.slice(start + open.length, end).replace("window.HelloSquad = {", "return {");
  return [
    "// @ts-nocheck",
    "/* eslint-disable */",
    "// Gerado por packages/ui/scripts/extract-landing.ts a partir de ds/hellosquad/components/bundle.js (o mesmo da Product UI).",
    "// Não edite à mão: rode pnpm --filter @hellosquad/ui extract:landing. Só muda o invólucro: React entra por parâmetro.",
    "export function createHelloSquad(React) {",
    "  'use strict';",
    body.trimEnd(),
    "}",
    "",
  ].join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const html = readFileSync(LANDING, "utf8");
  writeFileSync(OUT_LANDING_CSS, buildLandingCss(html));
  writeFileSync(OUT_LANDING_TEMPLATE, buildLandingTemplate(html));
  writeFileSync(OUT_LANDING_LOGIC, buildLandingLogic(html));
  writeFileSync(OUT_DS_RUNTIME, buildDsRuntime(readFileSync(DS_BUNDLE_JS, "utf8")));
  console.log("gerado landing.css, landing-template.ts, landing-logic.ts e ds-bundle-runtime.ts em packages/ui/src/generated");
}
