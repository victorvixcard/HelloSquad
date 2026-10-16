#!/usr/bin/env node
// Converte o conteúdo do site público (docs/conteudo/site/<idioma>/*.md, escrito na N2a) no JSON que as páginas leem
// (apps/web/content/site/<idioma>.json). O texto continua sendo do Markdown: aqui só muda o formato.
//
//   node apps/web/scripts/site-content.mjs           # regera os três arquivos
//   node apps/web/scripts/site-content.mjs --check   # falha se o JSON commitado não bate com o Markdown
//
// O que fica de fora do JSON: notas para o time (comentários HTML), marcadores que só o dono preenche ({{…}}, e a
// seção que ficar vazia sem eles) e o corpo de inicio.md, que anota a landing aprovada (R32) em vez de ser texto
// corrido; dele só valem rota, title e description (a landing usa o catálogo site.json).
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.resolve(here, "../../../docs/conteudo/site");
const TARGET = path.resolve(here, "../content/site");
export const LOCALES = ["pt-BR", "en", "es"];

/** `chave: valor` do cabeçalho; valores entre aspas, `{ a: b, c: d }` ou texto, com `# comentário` no fim. */
export function parseFrontmatter(text) {
  const data = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([\w-]+):\s*(.*)$/);
    if (!m) continue;
    let value = m[2].replace(/\s+#\s.*$/, "").trim();
    if (value.startsWith('"')) value = JSON.parse(value.slice(0, value.lastIndexOf('"') + 1));
    else if (value.startsWith("{")) value = parseMap(value);
    data[m[1]] = value;
  }
  return data;
}

function parseMap(value) {
  const map = {};
  const inner = value.replace(/^\{\s*|\s*\}$/g, "");
  for (const m of inner.matchAll(/([\w-]+):\s*("[^"]*"|[^,]+?)\s*(?=,\s*[\w-]+:|$)/g)) {
    map[m[1]] = m[2].startsWith('"') ? JSON.parse(m[2]) : m[2].trim();
  }
  return map;
}

const slugify = (text) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const cells = (line) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());

/** Corpo em blocos: parágrafo, lista, lista numerada, tabela e pergunta com resposta. */
export function parseBody(text) {
  const lines = text.replace(/<!--[\s\S]*?-->/g, "").split("\n");
  const page = { h1: "", tagline: "", intro: [], sections: [], cta: false };
  let blocks = page.intro;
  let qa = null;
  const push = (block) => (qa ? qa.answer : blocks).push(block);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    if (!line.trim()) continue;
    if (line.startsWith("# ")) {
      page.h1 = line.slice(2).trim();
      continue;
    }
    if (line.startsWith("## ")) {
      const title = line.slice(3).trim();
      qa = null;
      blocks = [];
      page.sections.push({ id: slugify(title.replace(/^\d+\.\s*/, "")), title, blocks });
      continue;
    }
    if (line.startsWith("### ")) {
      qa = { type: "qa", question: line.slice(4).trim(), answer: [] };
      blocks.push(qa);
      continue;
    }
    if (/^\[[^\]]+\]$/.test(line.trim())) {
      // "[Começar com o squad]": o botão do fim da página (o rótulo vem do catálogo, chave site.cta).
      page.cta = true;
      continue;
    }
    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(cells(lines[i++]));
      i--;
      push({ type: "table", head: rows[0], rows: rows.slice(2) });
      continue;
    }
    const list = line.match(/^(- |\d+\. )/);
    if (list) {
      const type = list[1] === "- " ? "ul" : "ol";
      const items = [];
      while (i < lines.length && /^(- |\d+\. )/.test(lines[i])) items.push(lines[i++].replace(/^(- |\d+\. )/, "").trim());
      i--;
      push({ type, items });
      continue;
    }
    // Parágrafo: linhas seguidas até uma linha vazia ou outro bloco.
    const parts = [line.trim()];
    while (i + 1 < lines.length && lines[i + 1].trim() && !/^(#|\||- |\d+\. |\[[^\]]+\]$)/.test(lines[i + 1])) {
      parts.push(lines[++i].trim());
    }
    const paragraph = parts.join(" ");
    if (paragraph.includes("{{")) continue; // Só o dono preenche (P6 da N2a): nada de texto inventado.
    if (!page.tagline && !page.intro.length && !page.sections.length && /^\*\*.+\*\*$/.test(paragraph)) {
      page.tagline = paragraph.replace(/^\*\*|\*\*$/g, "").replace(/^"|"$/g, "");
      continue;
    }
    push({ type: "p", text: paragraph });
  }
  page.sections = page.sections.filter((section) => section.blocks.length > 0);
  return page;
}

function splitDocument(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error("arquivo sem cabeçalho ---");
  return { meta: parseFrontmatter(m[1]), body: m[2] };
}

export function buildLocale(locale) {
  const dir = path.join(SOURCE, locale);
  const pages = {};
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".md")).sort()) {
    const key = file.replace(/\.md$/, "");
    const { meta, body } = splitDocument(readFileSync(path.join(dir, file), "utf8"));
    if (meta.idioma !== locale) throw new Error(`${locale}/${file}: idioma "${meta.idioma}"`);
    const page = { key, path: meta.rota, title: meta.title, description: meta.description };
    if (meta.agente) page.agent = meta.agente;
    if (key !== "inicio") Object.assign(page, parseBody(body));
    pages[key] = page;
  }
  return { locale, source: `docs/conteudo/site/${locale}`, pages };
}

function serialize(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

function main() {
  const check = process.argv.includes("--check");
  const stale = [];
  for (const locale of LOCALES) {
    const file = path.join(TARGET, `${locale}.json`);
    const next = serialize(buildLocale(locale));
    if (check) {
      let current = "";
      try {
        current = readFileSync(file, "utf8");
      } catch {}
      if (current !== next) stale.push(file);
    } else {
      writeFileSync(file, next);
    }
  }
  if (stale.length) {
    console.error(`Conteúdo do site desatualizado; rode node apps/web/scripts/site-content.mjs:\n  ${stale.join("\n  ")}`);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
