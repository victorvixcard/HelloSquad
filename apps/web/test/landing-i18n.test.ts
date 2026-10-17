// Dicionários en/es da Landing R32 (L1): alinhados à lista pt-BR gerada por script e aplicados no HTML do servidor.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/content/landing/en.json";
import es from "@/content/landing/es.json";
import ptBR from "@/content/landing/pt-BR.json";
import { landingDictionary, untranslated } from "@/lib/landing-i18n";

describe("dicionários da landing R32", () => {
  it("a lista pt-BR está em dia com o template e a classe gerados", () => {
    const script = path.resolve(__dirname, "../scripts/landing-strings.mjs");
    expect(execFileSync("node", [script, "--check"], { encoding: "utf8" })).toContain("em dia");
  });

  it("en e es só usam índices que existem na lista pt-BR", () => {
    for (const map of [en, es]) for (const k of Object.keys(map)) if (/^\d+$/.test(k)) expect(Number(k)).toBeLessThan(ptBR.length);
  });

  it("os textos visíveis da página estão traduzidos (sobram só nomes, códigos e trechos de código)", () => {
    for (const locale of ["en", "es"] as const) {
      const left = untranslated(locale);
      expect(left.length, `${locale}: ${left.slice(0, 5).join(" | ")}`).toBeLessThan(60);
    }
    expect(landingDictionary("en")!["Você cuida do seu negócio."]).toBe("You run your business.");
    expect(landingDictionary("es")!["Do pedido à entrega."]).toBe("Del pedido a la entrega.");
    expect(landingDictionary("pt-BR")).toBeUndefined();
  });
});
