// @vitest-environment node
import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/config";
import { icuArguments, icuTags } from "@/i18n/icu";

// Os catálogos de todos os idiomas, lidos do disco: idioma sem pasta falha aqui, com o nome do idioma.
const CATALOGS: Record<string, Record<string, unknown> | undefined> = {};
for (const locale of LOCALES) {
  try {
    CATALOGS[locale] = (await import(`../messages/${locale}/index.ts`)).default;
  } catch {
    CATALOGS[locale] = undefined;
  }
}

const SOURCE = CATALOGS[DEFAULT_LOCALE]!;
const TRANSLATIONS = LOCALES.filter((l) => l !== DEFAULT_LOCALE);

/** Argumento gramatical do pt-BR (artigo do agente: "a Kaia", "o Otto"); en e es podem não usar. */
const OPTIONAL_ARGS = new Set(["article"]);

/** Campo técnico dentro do catálogo (ids de agente; nome de cada idioma no próprio idioma): igual em todos os idiomas. */
const TECHNICAL_KEYS = new Set(["ags", "localeNames"]);

type Leaf = { path: string; value: unknown; inArray: boolean; technical: boolean };

function leaves(node: unknown, path: string[] = [], inArray = false, technical = false, out: Leaf[] = []): Leaf[] {
  if (Array.isArray(node)) node.forEach((v, i) => leaves(v, [...path, String(i)], true, technical, out));
  else if (node && typeof node === "object")
    for (const [k, v] of Object.entries(node)) leaves(v, [...path, k], inArray, technical || TECHNICAL_KEYS.has(k), out);
  else out.push({ path: path.join("."), value: node, inArray, technical });
  return out;
}

function shape(node: unknown, path = "", out = new Map<string, string>()): Map<string, string> {
  if (Array.isArray(node)) {
    out.set(path, `lista de ${node.length}`);
    node.forEach((v, i) => shape(v, `${path}.${i}`, out));
  } else if (node && typeof node === "object") {
    out.set(path || "(raiz)", `objeto {${Object.keys(node).join(", ")}}`);
    for (const [k, v] of Object.entries(node)) shape(v, path ? `${path}.${k}` : k, out);
  } else out.set(path, typeof node);
  return out;
}

const SOURCE_LEAVES = new Map(leaves(SOURCE).map((l) => [l.path, l]));

/**
 * Marcas que só o português tem (espanhol e inglês não usam): texto com elas em en ou es ficou sem tradução. Texto
 * igual ao pt-BR sem elas é legítimo ("Resultados", "Conectar" e "Semana" são espanhol; "Status" é inglês).
 */
const PORTUGUESE_ONLY = /[ãõçÃÕÇ]|\b(?:você|não|são|também|então|pra|um|uma|em|ainda|ao|aos|às)\b|(?:^|\s)(?:é|à)(?:\s|$)/i;

describe.each(TRANSLATIONS)("catálogo %s (ADR-0010)", (locale) => {
  const catalog = CATALOGS[locale];
  // Sem a pasta do idioma, todo teste falha (nenhum passa por estar vazio).
  const ready = () => expect(catalog, `messages/${locale}/index.ts não existe`).toBeDefined();

  it("existe, com os mesmos arquivos de área do pt-BR", () => {
    ready();
    expect(Object.keys(catalog!)).toEqual(Object.keys(SOURCE));
  });

  it("tem exatamente as chaves do pt-BR, na mesma estrutura (nenhuma faltando, nenhuma sobrando)", () => {
    ready();
    const source = shape(SOURCE);
    const target = shape(catalog);
    const missing = [...source.keys()].filter((k) => !target.has(k));
    const extra = [...target.keys()].filter((k) => !source.has(k));
    const different = [...source.entries()].filter(([k, v]) => target.has(k) && target.get(k) !== v).map(([k]) => k);
    expect({ missing, extra, different }).toEqual({ missing: [], extra: [], different: [] });
  });

  it("mantém os argumentos e as tags de cada mensagem (só o artigo do agente pode sumir)", () => {
    ready();
    const problems: string[] = [];
    for (const leaf of leaves(catalog)) {
      const src = SOURCE_LEAVES.get(leaf.path);
      if (!src || typeof src.value !== "string" || typeof leaf.value !== "string") continue;
      const want = [...icuArguments(src.value)].filter((a) => !OPTIONAL_ARGS.has(a)).sort();
      const got = [...icuArguments(leaf.value)].filter((a) => !OPTIONAL_ARGS.has(a)).sort();
      const unknown = [...icuArguments(leaf.value)].filter((a) => !icuArguments(src.value as string).has(a));
      if (want.join() !== got.join() || unknown.length) problems.push(`${leaf.path}: ${want.join()} → ${got.join()}`);
      if ([...icuTags(src.value)].sort().join() !== [...icuTags(leaf.value)].sort().join()) problems.push(`${leaf.path}: tags`);
    }
    expect(problems).toEqual([]);
  });

  it("toda mensagem formata no próprio idioma, sem erro de ICU", () => {
    ready();
    const errors: string[] = [];
    const t = createTranslator({
      locale,
      messages: catalog as never,
      onError: (error) => errors.push(error.message),
      getMessageFallback: ({ key }) => `FALHOU:${key}`,
    });
    for (const leaf of leaves(catalog)) {
      if (leaf.inArray || typeof leaf.value !== "string") continue;
      const args = icuArguments(leaf.value);
      const tags = Object.fromEntries([...icuTags(leaf.value)].map((tag) => [tag, (chunks: string) => chunks]));
      for (const n of [1, 2]) {
        const values = Object.fromEntries([...args].map((a) => [a, /count|done|total|active|paused|n$/i.test(a) ? n : "a"]));
        const out = (t.markup as unknown as (key: string, values: object) => string)(leaf.path, { ...values, ...tags });
        if (out.startsWith("FALHOU:")) errors.push(leaf.path);
      }
    }
    expect(errors).toEqual([]);
  });

  it("campos técnicos (ids de agente e nomes dos idiomas) ficam iguais; nenhum texto ficou em português", () => {
    ready();
    const technical: string[] = [];
    const portuguese: string[] = [];
    for (const leaf of leaves(catalog)) {
      const src = SOURCE_LEAVES.get(leaf.path);
      if (leaf.technical) {
        if (!src || leaf.value !== src.value) technical.push(leaf.path);
      } else if (typeof leaf.value === "string" && PORTUGUESE_ONLY.test(leaf.value.replace(/\{[^}]*\}/g, ""))) {
        portuguese.push(`${leaf.path}: ${leaf.value}`);
      }
    }
    expect({ technical, portuguese }).toEqual({ technical: [], portuguese: [] });
  });

  it("não usa apóstrofo reto (no ICU ele vira escape) e mantém os exemplos em .example", () => {
    ready();
    const text = JSON.stringify(catalog);
    expect(text).not.toContain("'");
    const emails = text.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? [];
    expect(emails.filter((e) => !e.endsWith(".example"))).toEqual([]);
  });
});
