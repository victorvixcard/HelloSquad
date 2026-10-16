import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { factItem, groupItems, keyFact, topicIdOf, type Filters } from "@/components/memory/memory-model";
import type { BrandFact } from "@/lib/memory";
import { objectiveFact, onboardingFrom, OBJECTIVE_FACT } from "@/lib/onboarding";

// H2-06: a Memória compara assunto por id estável (rótulo pelo catálogo, nos três idiomas), não por texto em pt-BR.
function fact(over: Partial<BrandFact>): BrandFact {
  return {
    id: over.id ?? "f1",
    workspace_id: "ws-1",
    area: "business",
    topic: "History",
    key: "Business",
    content: "Bakery",
    state: "confirmed",
    source_type: "onboarding",
    used_by_agents: [],
    ...over,
  } as BrandFact;
}
const ALL: Filters = { area: "all", q: "", agent: null, showHidden: false };

describe("topicIdOf: o mesmo assunto nos três idiomas", () => {
  it("pt-BR, en e es levam ao mesmo id; maiúsculas e espaços não contam", () => {
    for (const label of ["Proposta de valor", "Value proposition", "Propuesta de valor", "  value   PROPOSITION "]) {
      expect(topicIdOf("business", label)).toBe("value");
    }
    expect(topicIdOf("business", "Goals")).toBe("goals");
    expect(topicIdOf("business", "Objetivos")).toBe("goals");
    expect(topicIdOf("audience", "Perfil de los clientes")).toBe("profile");
  });

  it("assunto de outra área ou fora da lista não tem id", () => {
    expect(topicIdOf("brand", "Value proposition")).toBeNull();
    expect(topicIdOf("business", "Coisas da casa")).toBeNull();
  });

  it("os nomes que o backend grava (assunto padrão e objetivo) resolvem no id certo, nos três idiomas", () => {
    for (const locale of ["pt-BR", "en", "es"]) {
      const file = path.resolve(__dirname, `../../backend/src/hellosquad/i18n/${locale}.json`);
      const backend = JSON.parse(readFileSync(file, "utf8")) as Record<string, string>;
      expect(topicIdOf("business", backend["memory.default_topic.business"]!), locale).toBe("history");
      expect(topicIdOf("brand", backend["memory.default_topic.brand"]!), locale).toBe("positioning");
      expect(topicIdOf("audience", backend["memory.default_topic.audience"]!), locale).toBe("profile");
      expect(topicIdOf("knowledge", backend["memory.default_topic.knowledge"]!), locale).toBe("research");
      expect(topicIdOf("business", backend["memory.objective_topic"]!), locale).toBe("goals");
      expect(objectiveFact(locale).key, locale).toBe(backend["memory.objective_key"]);
    }
  });
});

describe("Memória num negócio en: ordem da V4.5 e Principais conhecimentos", () => {
  const items = [
    fact({ id: "g", topic: "Goals", key: "Current goal", content: "Sell more" }),
    fact({ id: "p", topic: "Products", key: "Anchor product", content: "Sourdough" }),
    fact({ id: "h", topic: "History", key: "Business", content: "Bakery" }),
    fact({ id: "v", topic: "Value proposition", key: "Promise", content: "Slow bread" }),
    fact({ id: "t", area: "brand", topic: "Tone of voice", key: "Tone", content: "Warm" }),
  ].map((f) => factItem(f, []));

  it("os assuntos saem na ordem da V4.5, como em pt-BR", () => {
    const business = groupItems(items, ALL).find((g) => g.area === "business")!;
    expect(business.topics.map((t) => t.topic)).toEqual(["History", "Value proposition", "Products", "Goals"]);
  });

  it("o dossiê acha a proposta de valor e o tom de voz pelo id", () => {
    expect(keyFact(items, "business", "value")?.value).toBe("Slow bread");
    expect(keyFact(items, "brand", "tone")?.value).toBe("Warm");
    expect(keyFact(items, "business", "differentials")).toBeNull();
  });
});

describe("objetivo do primeiro acesso", () => {
  it("é reconhecido em en e es, não só em pt-BR", () => {
    expect(onboardingFrom({ areas: [{ area: "business", topics: [{ topic: "Goals", facts: [fact({ topic: "Goals" })] }] }], sources: [] }).objective).toBe(
      "Bakery",
    );
    const es = fact({ topic: "Objetivos", key: "Objetivo actual", content: "Vender más" });
    expect(onboardingFrom({ areas: [{ area: "business", topics: [{ topic: "Objetivos", facts: [es] }] }], sources: [] }).objective).toBe(
      "Vender más",
    );
  });

  it("assunto e chave vêm do catálogo no idioma do negócio (pt-BR sem idioma)", () => {
    expect(objectiveFact("en")).toEqual({ area: "business", topic: "Goals", key: "Current goal" });
    expect(objectiveFact("es")).toEqual({ area: "business", topic: "Objetivos", key: "Objetivo actual" });
    expect(objectiveFact(undefined)).toEqual({ area: "business", topic: "Objetivos", key: "Objetivo atual" });
    expect(OBJECTIVE_FACT).toEqual(objectiveFact("pt-BR"));
  });
});
