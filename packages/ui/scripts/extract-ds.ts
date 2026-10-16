// Extrai a identidade oficial do handoff V4.6 para src/generated/, sem redesenho:
//   - agentes (corpo, contorno e olhos em 6 expressões x 3 cortes ópticos) e os 11 ícones de traço:
//     objeto `D` do bundle do Design System (ds/hellosquad/components/bundle.js);
//   - glifos de status ("um desenho por estado") e ícones da barra lateral: ProductUIV4.dc.html
//     (WK_SG, RIC5, IC.nav, IC.panel);
//   - o squad (nome, artigo, área, cor, tinta suave, forma): squad/*/agent.yaml.
// Uso: pnpm --filter @hellosquad/ui extract:ds. O teste test/generated.test.ts falha se algum
// arquivo gerado ficar defasado das fontes.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");

export const SOURCES = {
  bundle: path.join(root, "design/handoff-v4.6/product-ui/ds/hellosquad/components/bundle.js"),
  productUi: path.join(root, "design/handoff-v4.6/product-ui/ProductUIV4.dc.html"),
  squad: path.join(root, "squad"),
};
export const OUT_DIR = path.resolve(here, "../src/generated");

const EXPRESSIONS = ["oval", "big", "happy", "wink", "serio", "sleep"] as const;
const OPTICAL = ["o135", "o118", "o1"] as const;
const ICON_NAMES = ["arrow", "up", "plus", "check", "chev", "left", "right", "close", "enter", "more", "play"];

type DsAgent = {
  name: string;
  color: string;
  shade: string;
  body: string;
  ring: string;
  inner: string;
  eyes: Record<string, Record<string, string>>;
};
type DsData = {
  order: string[];
  agents: Record<string, DsAgent>;
  icons: Record<string, { vb: string; inner: string; fill: boolean }>;
};

/** Lê o objeto `var D = {...};` do bundle (JSON puro numa linha só). */
export function readDsData(file = SOURCES.bundle): DsData {
  const line = readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("var D = {"));
  if (!line || !line.endsWith(";")) throw new Error(`Objeto D não encontrado em ${file}`);
  return JSON.parse(line.slice("var D = ".length, -1)) as DsData;
}

/** Recorta o literal de objeto que começa no primeiro "{" depois de `marker`, respeitando aspas. */
export function sliceObjectLiteral(source: string, marker: string, from = 0): string {
  const at = source.indexOf(marker, from);
  if (at < 0) throw new Error(`Marcador não encontrado: ${marker}`);
  const start = source.indexOf("{", at);
  let depth = 0;
  let quote: string | null = null;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") quote = ch;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Literal sem fechamento depois de ${marker}`);
}

/** Converte um literal JS simples (chaves sem aspas, strings em aspas simples) em valor. */
export function parseJsLiteral(literal: string): unknown {
  const strings: string[] = [];
  const json = literal
    .replace(/'((?:[^'\\]|\\.)*)'/g, (_m, s: string) => {
      strings.push(s);
      return `"@@${strings.length - 1}@@"`;
    })
    .replace(/\/\/[^\n]*/g, "")
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
    .replace(/,(\s*[}\]])/g, "$1")
    .replace(/"@@(\d+)@@"/g, (_m, i: string) => JSON.stringify(strings[Number(i)]));
  return JSON.parse(json);
}

type ProductUiData = {
  statusGlyphs: Record<string, { fill: string; mark: string; ring: boolean }>;
  navIcons: Record<string, string[]>;
  panelIcon: string;
  /** Ícones de traço da Product UI (objeto IC e reatribuições IC.x = '...'), grade 18. */
  icons: Record<string, string>;
};

export function readProductUiData(file = SOURCES.productUi): ProductUiData {
  const html = readFileSync(file, "utf8");
  const wk = parseJsLiteral(sliceObjectLiteral(html, "const WK_SG = {")) as Record<string, [string, string]>;
  const ric = parseJsLiteral(sliceObjectLiteral(html, "const RIC5 = {")) as Record<string, string>;
  // "Em andamento", "Programado", "Concluído", "Pausado" e "Aguardando você" vêm do sinal de
  // situação (anel + preenchimento + marca); "Bloqueado" e "Erro", dos estados do Modo Autônomo.
  const statusGlyphs: ProductUiData["statusGlyphs"] = {};
  for (const [key, [fill, mark]] of Object.entries(wk)) statusGlyphs[key] = { fill, mark, ring: true };
  for (const key of ["block", "fail"]) statusGlyphs[key] = { fill: "", mark: ric[key], ring: false };

  const iconsStart = html.indexOf("nav: {\n    home:");
  const baseNav = parseJsLiteral(sliceObjectLiteral(html, "nav: {", iconsStart)) as Record<string, string[]>;
  const extraLiteral = sliceObjectLiteral(html, "Object.assign(IC.nav, {")
    .split("\n")
    .filter((l) => !l.includes("IC.nav."))
    .join("\n");
  const extraNav = parseJsLiteral(extraLiteral) as Record<string, string[]>;
  // Reatribuições posteriores (a V4.2 troca o ícone de "media" pela curva do Growth: IC.nav.media = [...]).
  const overrides: Record<string, string[]> = {};
  for (const m of html.matchAll(/^IC\.nav\.(\w+) = (\[[^\n]*\]);$/gm)) {
    overrides[m[1]] = parseJsLiteral(m[2]) as string[];
  }
  const navIcons = { ...baseNav, ...extraNav, ...overrides };
  const panel = /\bpanel: '([^']+)'/.exec(html);
  if (!panel) throw new Error("Ícone panel não encontrado");
  const icBlock = sliceObjectLiteral(html, "const IC = {");
  const icons: Record<string, string> = {};
  for (const m of icBlock.matchAll(/^  (\w+): '([^']+)',?$/gm)) icons[m[1]] = m[2];
  for (const m of html.matchAll(/^IC\.(\w+) = '([^']+)';$/gm)) icons[m[1]] = m[2];
  return { statusGlyphs, navIcons, panelIcon: panel[1], icons };
}

type SquadMember = {
  id: string;
  name: string;
  article: string;
  area: string;
  role: string;
  roleFull: string;
  color: string;
  softTint: string;
  shape: string;
};

export function readSquad(dir = SOURCES.squad, order = readDsData().order): SquadMember[] {
  const members = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const y = parseYaml(readFileSync(path.join(dir, d.name, "agent.yaml"), "utf8")) as Record<string, string>;
      return {
        id: y.id,
        name: y.name,
        article: y.artigo,
        area: y.area_ui,
        role: y.papel,
        roleFull: y.papel_completo,
        color: y.cor,
        softTint: y.tinta_suave,
        shape: y.forma,
      };
    });
  return order.map((shape) => {
    const m = members.find((x) => x.shape === shape);
    if (!m) throw new Error(`Nenhum agente de squad/ usa a forma ${shape}`);
    return m;
  });
}

const BANNER = (sources: string) =>
  `// Gerado por packages/ui/scripts/extract-ds.ts a partir de ${sources}.\n// Não edite à mão: rode pnpm --filter @hellosquad/ui extract:ds.\n`;

const lit = (v: unknown) => JSON.stringify(v, null, 2);

export function renderAgents(ds: DsData, squad: SquadMember[]): string {
  const shapes: Record<string, unknown> = {};
  for (const key of ds.order) {
    const a = ds.agents[key];
    const eyes: Record<string, Record<string, string>> = {};
    for (const x of EXPRESSIONS) {
      eyes[x] = Object.fromEntries(OPTICAL.map((o) => [o, a.eyes[x][o]]));
    }
    shapes[key] = { color: a.color, shade: a.shade, body: a.body, ring: a.ring, inner: a.inner, eyes };
  }
  return [
    BANNER("ds/hellosquad/components/bundle.js (objeto D) e squad/*/agent.yaml"),
    "/** Desenho oficial de cada forma: viewBox -170 -170 340 340, olhos em três cortes ópticos. */",
    `export const AGENT_SHAPES = ${lit(shapes)} as const;`,
    "",
    "/** O squad na ordem oficial do Design System, com a identidade de squad/<agente>/agent.yaml. */",
    `export const SQUAD = ${lit(squad)} as const;`,
    "",
    `export const EXPRESSIONS = ${JSON.stringify(EXPRESSIONS)} as const;`,
    "",
  ].join("\n");
}

export function renderIcons(ds: DsData): string {
  const icons = Object.fromEntries(ICON_NAMES.map((n) => [n, ds.icons[n]]));
  return [
    BANNER("ds/hellosquad/components/bundle.js (objeto D.icons)"),
    "/** Os 11 ícones de traço do DS (grade 18 x 18, traço 1,9 px, currentColor). */",
    `export const ICONS = ${lit(icons)} as const;`,
    "",
  ].join("\n");
}

export function renderProductUi(data: ProductUiData): string {
  return [
    BANNER("product-ui/ProductUIV4.dc.html (WK_SG, RIC5, IC.nav, IC.panel)"),
    "/** Sinal de situação, grade 16: anel (g-o), preenchimento (g-f) e marca (g-m). */",
    `export const STATUS_GLYPHS = ${lit(data.statusGlyphs)} as const;`,
    "",
    "/** Ícones dos destinos da barra lateral V4.6 (grade 18, traço arredondado), em partes. */",
    `export const NAV_ICONS = ${lit(data.navIcons)} as const;`,
    "",
    `export const PANEL_ICON = ${JSON.stringify(data.panelIcon)};`,
    "",
    "/** Ícones de traço da Product UI V4.6 (objeto IC do protótipo), grade 18, um path cada. */",
    `export const PRODUCT_ICONS = ${lit(data.icons)} as const;`,
    "",
    "export type ProductIconName = keyof typeof PRODUCT_ICONS;",
    "",
  ].join("\n");
}

export function renderAll(): Record<string, string> {
  const ds = readDsData();
  return {
    "agents.ts": renderAgents(ds, readSquad(SOURCES.squad, ds.order)),
    "icons.ts": renderIcons(ds),
    "product-ui.ts": renderProductUi(readProductUiData()),
  };
}

function main() {
  for (const [name, content] of Object.entries(renderAll())) {
    writeFileSync(path.join(OUT_DIR, name), content);
    console.log(`gerado: src/generated/${name}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
