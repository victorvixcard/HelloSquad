// Defasagem da landing portada (L1): os arquivos gerados batem com o .dc.html e o bundle.js do handoff.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildDsRuntime,
  buildLandingCss,
  buildLandingLogic,
  buildLandingTemplate,
  DS_BUNDLE_JS,
  LANDING,
  NEUTRAL,
  OUT_DS_RUNTIME,
  OUT_LANDING_CSS,
  OUT_LANDING_LOGIC,
  OUT_LANDING_TEMPLATE,
} from "../scripts/extract-landing";

const html = readFileSync(LANDING, "utf8");

describe("landing R32 gerada por script", () => {
  it("CSS, template, classe Component e bundle do DS em dia com o handoff", () => {
    expect(readFileSync(OUT_LANDING_CSS, "utf8")).toBe(buildLandingCss(html));
    expect(readFileSync(OUT_LANDING_TEMPLATE, "utf8")).toBe(buildLandingTemplate(html));
    expect(readFileSync(OUT_LANDING_LOGIC, "utf8")).toBe(buildLandingLogic(html));
    expect(readFileSync(OUT_DS_RUNTIME, "utf8")).toBe(buildDsRuntime(readFileSync(DS_BUNDLE_JS, "utf8")));
  });

  it("sem Google Fonts e sem os logotipos de terceiros; as trocas neutras foram aplicadas", () => {
    const css = readFileSync(OUT_LANDING_CSS, "utf8");
    expect(css).not.toMatch(/fonts\.googleapis|'Gabarito'|'JetBrains Mono'/);
    expect(css).not.toContain('data-brand="canva"');
    const tpl = readFileSync(OUT_LANDING_TEMPLATE, "utf8");
    const logic = readFileSync(OUT_LANDING_LOGIC, "utf8");
    for (const [where, from, to] of NEUTRAL) {
      const src = where === "tpl" ? tpl : logic;
      if (!from.startsWith(" data-brand")) expect(src).not.toContain(from);
      if (!to.startsWith(" aria-hidden")) expect(src).toContain(to);
    }
  });
});
