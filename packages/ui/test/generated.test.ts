import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { OUT_DIR, readDsData, renderAll } from "../scripts/extract-ds";
import { ICONS } from "../src/generated/icons";
import { NAV_ICONS, STATUS_GLYPHS } from "../src/generated/product-ui";
import { AGENT_SHAPES, SQUAD } from "../src/squad";

describe("identidade extraída do handoff V4.6", () => {
  it.each(Object.entries(renderAll()))(
    "src/generated/%s está em dia com as fontes (rode pnpm --filter @hellosquad/ui extract:ds)",
    (name, content) => {
      expect(readFileSync(path.join(OUT_DIR, name), "utf8")).toBe(content);
    },
  );

  it("o squad tem os sete agentes na ordem oficial", () => {
    expect(SQUAD.map((m) => m.id)).toEqual(["nexo", "bia", "kaia", "otto", "kiwi", "max", "iris"]);
    expect(SQUAD.map((m) => m.shape)).toEqual(readDsData().order);
  });

  it("a cor de cada agente em squad/ é a mesma do desenho oficial do DS", () => {
    for (const member of SQUAD) {
      expect(member.color.toUpperCase()).toBe(AGENT_SHAPES[member.shape].color.toUpperCase());
    }
  });

  it("Kiwi é Growth Marketing (decisão do dono de 15/10/2026)", () => {
    const kiwi = SQUAD.find((m) => m.id === "kiwi");
    expect(kiwi?.area).toBe("Growth Marketing");
    expect(kiwi?.article).toBe("a");
  });

  it("cada agente tem as seis expressões nos três cortes ópticos", () => {
    for (const shape of Object.values(AGENT_SHAPES)) {
      for (const expression of ["oval", "big", "happy", "wink", "serio", "sleep"] as const) {
        expect(Object.keys(shape.eyes[expression])).toEqual(["o135", "o118", "o1"]);
      }
    }
  });

  it("os 11 ícones de traço do DS estão presentes", () => {
    expect(Object.keys(ICONS)).toEqual([
      "arrow", "up", "plus", "check", "chev", "left", "right", "close", "enter", "more", "play",
    ]);
  });

  it("os glifos de status e os ícones da barra lateral vieram do protótipo", () => {
    expect(Object.keys(STATUS_GLYPHS).sort()).toEqual(
      ["and", "block", "done", "fail", "pause", "prog", "you"].sort(),
    );
    for (const key of ["home", "chat", "works", "strat", "brand", "cont", "media", "crm", "res", "auto", "mem", "team"]) {
      expect(NAV_ICONS).toHaveProperty(key);
    }
  });
});
