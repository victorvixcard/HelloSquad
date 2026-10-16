// Porta o palco do Início V3 (os sete agentes em cena) do ProductUIV4.dc.html para src/generated/squad-stage.ts,
// sem redesenho: o SVG estático (svg.hm-squad) e o motor que move corpos, sombras, olhar e piscadas
// (constantes SQ_* e os métodos _sq* da classe Component), copiados como estão. Só muda o invólucro:
// os métodos passam a viver em SquadStageEngine, que lê o estado (view, cv.mode, homeSel, homeMin) de quem o usa.
// Uso: pnpm --filter @hellosquad/ui extract:stage. O teste test/generated.test.ts falha se o arquivo ficar defasado.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
export const STAGE_SOURCE = path.join(root, "design/handoff-v4.6/product-ui/ProductUIV4.dc.html");
export const OUT_STAGE = path.resolve(here, "../src/generated/squad-stage.ts");

function between(src: string, startMarker: string, endMarker: string, includeEnd = true): string {
  const a = src.indexOf(startMarker);
  if (a < 0) throw new Error(`marcador não encontrado: ${startMarker}`);
  const b = src.indexOf(endMarker, a);
  if (b < 0) throw new Error(`marcador não encontrado: ${endMarker}`);
  return src.slice(a, includeEnd ? b + endMarker.length : b);
}

export function buildSquadStage(html: string): string {
  const svg = between(html, '<svg class="hm-squad"', "</svg></div>", false) + "</svg>";
  const consts = between(html, "// queda ao recolher os resumos", "  return { pos: o, g: g };\n}\n");
  const order = /^const ORDER = \[[^\]]*\];$/m.exec(html);
  if (!order) throw new Error("ORDER não encontrado");
  const methods = between(html, "  // ------------------------------------------------------------ Início · palco do squad", "\n  _notifGo(go) {", false);
  return [
    "// @ts-nocheck",
    "/* eslint-disable */",
    "// Gerado por packages/ui/scripts/extract-squad-stage.ts a partir de product-ui/ProductUIV4.dc.html (svg.hm-squad, SQ_*, _sq*).",
    "// Não edite à mão: rode pnpm --filter @hellosquad/ui extract:stage.",
    "",
    `export const SQUAD_STAGE_SVG = ${JSON.stringify(svg)};`,
    "",
    order[0],
    consts,
    "export class SquadStageEngine {",
    "  constructor(getState) { this._getState = getState; }",
    "  get state() { return this._getState(); }",
    methods.trimEnd(),
    "}",
    "",
  ].join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync(OUT_STAGE, buildSquadStage(readFileSync(STAGE_SOURCE, "utf8")));
  console.log(`gerado ${path.relative(root, OUT_STAGE)}`);
}
