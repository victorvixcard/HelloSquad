// Porta o CSS da Product UI V4.6 (o <style> do ProductUIV4.dc.html) para src/generated/product-ui.css,
// sem redesenho: as regras são as mesmas, na mesma ordem (a cascata V3 → V4 → V4.6 depende dela).
// Únicas trocas, mecânicas:
//   - as famílias Gabarito e JetBrains Mono apontam para as fontes locais (--hs-font-display, --hs-font-mono);
//   - as curvas de movimento do bundle (--e-saida, --e-mola, --e-precisa) ganham apelido dos tokens oficiais.
// Uso: pnpm --filter @hellosquad/ui extract:css. O teste test/generated.test.ts falha se o arquivo ficar defasado.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
export const PRODUCT_UI = path.join(root, "design/handoff-v4.6/product-ui/ProductUIV4.dc.html");
export const OUT_CSS = path.resolve(here, "../src/generated/product-ui.css");

export function buildProductUiCss(html: string): string {
  const start = html.indexOf("<style>");
  const end = html.indexOf("</style>", start);
  if (start < 0 || end < 0) throw new Error("ProductUIV4.dc.html sem <style>");
  const css = html
    .slice(start + "<style>".length, end)
    .trim()
    .replaceAll("font-family:'Gabarito',sans-serif", "font-family:var(--hs-font-display)")
    .replaceAll("font-family:'JetBrains Mono',monospace", "font-family:var(--hs-font-mono)")
    .replaceAll(" 'Gabarito',sans-serif", " var(--hs-font-display)");
  const header = [
    "/* Gerado por packages/ui/scripts/extract-product-ui-css.ts a partir de product-ui/ProductUIV4.dc.html (<style>).",
    "   Não edite à mão: rode pnpm --filter @hellosquad/ui extract:css. */",
    ":root{--e-saida:var(--hs-e-saida);--e-mola:var(--hs-e-mola);--e-precisa:var(--hs-e-precisa)}",
  ].join("\n");
  return `${header}\n${css}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync(OUT_CSS, buildProductUiCss(readFileSync(PRODUCT_UI, "utf8")));
  console.log(`gerado ${path.relative(root, OUT_CSS)}`);
}
