import { describe, expect, it } from "vitest";
import { composeTranslator } from "@/components/landing/compose";
import { landingDictionary } from "@/lib/landing-i18n";

describe("frases montadas pela classe da R32 (en/es)", () => {
  it("nomes, papel e estado do Hero", () => {
    const en = composeTranslator("en", landingDictionary("en")!);
    expect(en("Bia, Kaia e Kiwi")).toBe("Bia, Kaia and Kiwi");
    expect(en("Kaia (Criação)")).toBe("Kaia (Creative)");
    expect(en("Nexo está montando seu squad.")).toBe("Nexo is building your squad.");
    expect(en("Bia, Kaia e Kiwi estão a postos.")).toBe("Bia, Kaia and Kiwi are ready.");
    const es = composeTranslator("es", landingDictionary("es")!);
    expect(es("Otto e Íris estão a postos")).toBe("Otto y Íris están listos");
    expect(es("Do pedido à entrega.")).toBe("Del pedido a la entrega.");
  });
});
