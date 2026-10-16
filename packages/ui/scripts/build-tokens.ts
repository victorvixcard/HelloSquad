// Gera src/tokens.css (variáveis --hs-*) e src/tokens.ts (objeto tipado) a partir de
// design/handoff-v4.6/product-ui/ds/hellosquad/tokens.json, a fonte oficial dos tokens.
// Uso: pnpm --filter @hellosquad/ui build:tokens. O teste test/tokens.test.ts falha se os
// arquivos gerados ficarem defasados do JSON.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const TOKENS_JSON = path.resolve(
  here,
  "../../../design/handoff-v4.6/product-ui/ds/hellosquad/tokens.json",
);
export const OUT_CSS = path.resolve(here, "../src/tokens.css");
export const OUT_TS = path.resolve(here, "../src/tokens.ts");

type Token = { name: string; value: string; usage?: string };
type TypeStyle = {
  name: string;
  fontSize: string;
  fontWeight: number;
  letterSpacing?: string;
  lineHeight: number;
  usage?: string;
};
type TypeGroup = { name: string; family: string; styles: TypeStyle[] };
export type TokensJson = {
  name: string;
  version: number;
  color: { tokens: Token[] };
  type: { families: Record<string, string>; groups: TypeGroup[] };
  spacing: { tokens: Token[] };
  radius: { tokens: Token[] };
  shadow: { tokens: Token[] };
  duration: { tokens: Token[] };
  easing: { tokens: Token[] };
};

const SOURCE = "design/handoff-v4.6/product-ui/ds/hellosquad/tokens.json";
const HEADER = `Gerado por packages/ui/scripts/build-tokens.ts a partir de ${SOURCE}. Não edite à mão: rode pnpm --filter @hellosquad/ui build:tokens.`;

const SCALES = ["spacing", "radius", "shadow", "duration", "easing"] as const;

export function readTokens(file = TOKENS_JSON): TokensJson {
  return JSON.parse(readFileSync(file, "utf8")) as TokensJson;
}

/** Nome da variável CSS: todo token ganha o prefixo --hs- (as cores já vêm com hs-). */
export function cssName(name: string): string {
  return `--${name.startsWith("hs-") ? name : `hs-${name}`}`;
}

const ALIAS = /^\{([a-z0-9-]+)\}$/;

function cssValue(value: string): string {
  const alias = ALIAS.exec(value);
  return alias ? `var(${cssName(alias[1])})` : value;
}

function resolveColor(tokens: Token[], value: string, seen = new Set<string>()): string {
  const alias = ALIAS.exec(value);
  if (!alias) return value;
  const target = tokens.find((t) => t.name === alias[1]);
  if (!target || seen.has(alias[1])) {
    throw new Error(`Apelido de cor sem destino ou circular: ${value}`);
  }
  seen.add(alias[1]);
  return resolveColor(tokens, target.value, seen);
}

function typeStyles(json: TokensJson) {
  return json.type.groups.flatMap((group) =>
    group.styles.map((style) => ({ ...style, family: group.family, group: group.name })),
  );
}

export function renderTokensCss(json: TokensJson): string {
  const lines: string[] = [`/* ${HEADER} */`, ":root {"];
  lines.push("  /* cor */");
  for (const t of json.color.tokens) lines.push(`  ${cssName(t.name)}: ${cssValue(t.value)};`);
  lines.push("  /* famílias */");
  for (const [key, value] of Object.entries(json.type.families)) {
    lines.push(`  --hs-font-${key}: ${value};`);
  }
  lines.push("  /* estilos de texto */");
  for (const s of typeStyles(json)) {
    const base = `--hs-type-${s.name}`;
    lines.push(`  ${base}-size: ${s.fontSize};`);
    lines.push(`  ${base}-weight: ${s.fontWeight};`);
    lines.push(`  ${base}-tracking: ${s.letterSpacing ?? "normal"};`);
    lines.push(`  ${base}-leading: ${s.lineHeight};`);
  }
  for (const scale of SCALES) {
    lines.push(`  /* ${scale} */`);
    for (const t of json[scale].tokens) lines.push(`  ${cssName(t.name)}: ${cssValue(t.value)};`);
  }
  lines.push("}", "");
  return lines.join("\n");
}

function record(entries: Array<[string, string | number]>, indent = "  "): string {
  return entries.map(([k, v]) => `${indent}${JSON.stringify(k)}: ${JSON.stringify(v)},`).join("\n");
}

export function renderTokensTs(json: TokensJson): string {
  const color = json.color.tokens.map(
    (t) => [t.name, resolveColor(json.color.tokens, t.value)] as [string, string],
  );
  const styles = typeStyles(json)
    .map(
      (s) =>
        `  ${JSON.stringify(s.name)}: { family: ${JSON.stringify(s.family)}, fontSize: ${JSON.stringify(s.fontSize)}, fontWeight: ${s.fontWeight}, letterSpacing: ${JSON.stringify(s.letterSpacing ?? "normal")}, lineHeight: ${s.lineHeight} },`,
    )
    .join("\n");
  const allNames = [
    ...json.color.tokens.map((t) => t.name),
    ...SCALES.flatMap((scale) => json[scale].tokens.map((t) => t.name)),
  ];
  const scales = SCALES.map(
    (scale) =>
      `  ${scale}: {\n${record(json[scale].tokens.map((t) => [t.name, t.value] as [string, string]), "    ")}\n  },`,
  ).join("\n");
  return [
    `// ${HEADER}`,
    "",
    "export const tokens = {",
    `  name: ${JSON.stringify(json.name)},`,
    `  version: ${json.version},`,
    "  /** Cores com apelidos já resolvidos (no CSS, o apelido vira var()). */",
    `  color: {\n${record(color, "    ")}\n  },`,
    `  font: {\n${record(Object.entries(json.type.families), "    ")}\n  },`,
    `  type: {\n${styles.replace(/^ {2}/gm, "    ")}\n  },`,
    scales,
    "} as const;",
    "",
    "export type ColorToken = keyof typeof tokens.color;",
    "export type TypeStyleName = keyof typeof tokens.type;",
    `export type TokenName =\n  | ColorToken\n${SCALES.map((scale) => `  | keyof typeof tokens.${scale}`).join("\n")};`,
    "",
    "/** Referência CSS de um token: cssVar(\"hs-papel\") === \"var(--hs-papel)\". */",
    "export function cssVar(name: TokenName): string {",
    '  return `var(--${name.startsWith("hs-") ? name : `hs-${name}`})`;',
    "}",
    "",
    `export const tokenNames = ${JSON.stringify(allNames)} as const;`,
    "",
  ].join("\n");
}

function main() {
  const json = readTokens();
  writeFileSync(OUT_CSS, renderTokensCss(json));
  writeFileSync(OUT_TS, renderTokensTs(json));
  console.log(`tokens gerados: ${path.relative(process.cwd(), OUT_CSS)}, ${path.relative(process.cwd(), OUT_TS)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
