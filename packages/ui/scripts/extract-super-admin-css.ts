// Porta o CSS do protótipo do Super Admin (SA0: design/super-admin-proto/app/shell.css e o CSS da página de Planos)
// para src/generated/super-admin.css, sem redesenho: as regras são as mesmas, na mesma ordem.
// Únicas trocas, mecânicas (as mesmas do extract-product-ui-css.ts):
//   - as famílias Gabarito e JetBrains Mono apontam para as fontes locais (--hs-font-display, --hs-font-mono).
// Uso: pnpm --filter @hellosquad/ui extract:admin. O teste test/generated.test.ts falha se o arquivo ficar defasado.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const PROTO = path.join(root, "design/super-admin-proto/app");
export const ADMIN_SOURCES = [path.join(PROTO, "shell.css"), path.join(PROTO, "pages/planos.css")];
export const OUT_ADMIN_CSS = path.resolve(here, "../src/generated/super-admin.css");

function localFonts(css: string): string {
  return css
    .replaceAll("font-family:'Gabarito',sans-serif", "font-family:var(--hs-font-display)")
    .replaceAll("font-family:'JetBrains Mono',monospace", "font-family:var(--hs-font-mono)")
    .replaceAll("fontFamily:\"'JetBrains Mono', monospace\"", "fontFamily:var(--hs-font-mono)");
}

export function buildSuperAdminCss(sources: string[]): string {
  return [
    "/* Gerado por packages/ui/scripts/extract-super-admin-css.ts a partir de design/super-admin-proto/app/shell.css",
    "   e pages/planos.css (protótipo SA0). Não edite à mão: rode pnpm --filter @hellosquad/ui extract:admin. */",
    ...sources.map((css) => localFonts(css).trim()),
    "",
  ].join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(OUT_ADMIN_CSS, buildSuperAdminCss(ADMIN_SOURCES.map((file) => readFileSync(file, "utf8"))));
  console.log(`super-admin.css: ${path.relative(root, OUT_ADMIN_CSS)}`);
}
