// Gera src/schema.ts (tipos TypeScript) a partir de openapi.json com openapi-typescript.
// O openapi.json vem do backend (`make openapi`); depois dele, rode:
//   pnpm --filter contracts generate
// O teste test/schema.test.ts falha se src/schema.ts ficar defasado do JSON.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const here = path.dirname(fileURLToPath(import.meta.url));

export const OPENAPI_JSON = path.resolve(here, "../openapi.json");
export const OUT_SCHEMA = path.resolve(here, "../src/schema.ts");

const HEADER = [
  "// Gerado por packages/contracts/scripts/generate.ts (openapi-typescript) a partir de",
  "// packages/contracts/openapi.json. Não edite à mão: rode pnpm --filter contracts generate.",
  "",
  "",
].join("\n");

export async function renderSchema(file = OPENAPI_JSON): Promise<string> {
  const spec = JSON.parse(readFileSync(file, "utf8"));
  const ast = await openapiTS(spec);
  return HEADER + astToString(ast);
}

async function main() {
  writeFileSync(OUT_SCHEMA, await renderSchema());
  console.log(`tipos gerados: ${path.relative(process.cwd(), OUT_SCHEMA)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
