import { SQUAD } from "@hellosquad/ui";
import { describe, expect, it } from "vitest";
import messages from "@/messages/pt-BR";

function keys(obj: unknown, prefix = ""): string[] {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
  return Object.entries(obj).flatMap(([k, v]) => [prefix + k, ...keys(v, `${prefix}${k}.`)]);
}

describe("catálogo pt-BR (ADR-0010)", () => {
  it("as áreas do squad no catálogo são as mesmas de squad/*/agent.yaml (Kiwi = Growth Marketing)", () => {
    for (const member of SQUAD) expect(messages.common.areas[member.id]).toBe(member.area);
  });

  it("nenhuma chave tem ponto (o next-intl usa o ponto para aninhar)", () => {
    for (const k of keys(messages)) expect(k.split(".").every((part) => part.length > 0)).toBe(true);
    expect(JSON.stringify(Object.keys(messages.common.deliveryTypes))).not.toContain("04.01");
  });

  it("e-mail e site de exemplo usam o TLD reservado .example (diretriz de 15/10, H1-11)", () => {
    expect(messages.auth.fields.emailPlaceholder).toBe("voce@seunegocio.example");
    expect(messages.home.onb.sitePlaceholder).toBe("seunegocio.example");
    const text = JSON.stringify(messages);
    const emails = text.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? [];
    expect(emails.filter((e) => !e.endsWith(".example"))).toEqual([]);
    expect(text).not.toMatch(/\b[\w-]+\.com\.br\b/);
  });

  it("a saudação do Início é a da V4.6", () => {
    expect(messages.home.hello).toBe("Hello, {name}.");
    expect(messages.home.question).toBe("Com o que vamos trabalhar hoje?");
  });
});
