import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  OUT_CSS,
  OUT_TS,
  readTokens,
  renderTokensCss,
  renderTokensTs,
} from "../scripts/build-tokens";
import { cssVar, tokens } from "../src/tokens";

const json = readTokens();

describe("tokens gerados de tokens.json", () => {
  it("tokens.css está em dia com o JSON (rode pnpm --filter @hellosquad/ui build:tokens)", () => {
    expect(readFileSync(OUT_CSS, "utf8")).toBe(renderTokensCss(json));
  });

  it("tokens.ts está em dia com o JSON (rode pnpm --filter @hellosquad/ui build:tokens)", () => {
    expect(readFileSync(OUT_TS, "utf8")).toBe(renderTokensTs(json));
  });

  it("toda cor do JSON vira variável --hs-* com o mesmo valor", () => {
    const css = readFileSync(OUT_CSS, "utf8");
    for (const t of json.color.tokens) {
      const expected = t.value.startsWith("{") ? `var(--${t.value.slice(1, -1)})` : t.value;
      expect(css).toContain(`--${t.name}: ${expected};`);
    }
  });

  it("escalas ganham o prefixo --hs- e o apelido de cor é resolvido no objeto TS", () => {
    const css = readFileSync(OUT_CSS, "utf8");
    expect(css).toContain("--hs-s-4: 16px;");
    expect(css).toContain("--hs-r-pilula: 999px;");
    expect(css).toContain("--hs-t-toque: 90ms;");
    expect(css).toContain("--hs-font-display: 'Gabarito', sans-serif;");
    expect(tokens.color["hs-coral"]).toBe(tokens.color["hs-coord"]);
    expect(cssVar("hs-papel")).toBe("var(--hs-papel)");
    expect(cssVar("r-campo")).toBe("var(--hs-r-campo)");
  });

  it("a interface neutra usa os valores oficiais", () => {
    expect(tokens.color["hs-papel"]).toBe("#F7F7F5");
    expect(tokens.color["hs-tinta"]).toBe("#0F0D22");
    expect(tokens.color["hs-branco"]).toBe("#FFFFFF");
  });
});
