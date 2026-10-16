import { describe, expect, it } from "vitest";
import { isSideMin, productLayout } from "@/lib/product-layout";

const base = { vh: 900, sideMin: null, pilot: false, pop: false } as const;

describe("medidas da casca (renderVals da V4.6)", () => {
  it("painel de conversa com 380 px a partir de 1360 e 364 abaixo", () => {
    expect(productLayout({ ...base, vw: 1440, mode: "panel" }).convW).toBe(380);
    expect(productLayout({ ...base, vw: 1360, mode: "panel" }).convW).toBe(380);
    expect(productLayout({ ...base, vw: 1359, mode: "panel" }).convW).toBe(364);
  });

  it("ao lado, o painel empurra a página; nos pilotos apertados (1280) abre por cima", () => {
    const side = productLayout({ ...base, vw: 1440, mode: "panel" });
    expect(side.mainW).toBe(1440 - 256 - 8 - 380 - 8);
    expect(side.rootClassName).toContain("is-panel");
    const over = productLayout({ ...base, vw: 1280, mode: "panel", pilot: true });
    expect(over.rootClassName).toContain("is-ov");
    expect(over.mainW).toBe(1280 - 256 - 8);
  });

  it("barra de 256 px, 72 recolhida, recolhida por padrão abaixo de 1100 px", () => {
    expect(isSideMin(1440, null)).toBe(false);
    expect(isSideMin(1099, null)).toBe(true);
    expect(isSideMin(1440, true)).toBe(true);
    expect(productLayout({ ...base, vw: 1440, sideMin: true, mode: "off" }).sideW).toBe(72);
  });

  it("conversa dedicada ocupa o palco inteiro", () => {
    const full = productLayout({ ...base, vw: 1440, mode: "full" });
    expect(full.convW).toBe(1440 - 256 - 8);
    expect(full.mainW).toBe(0);
  });
});
