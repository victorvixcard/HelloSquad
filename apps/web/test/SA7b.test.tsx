import { describe, expect, it } from "vitest";
import en from "@/messages/en";
import es from "@/messages/es";
import messages from "@/messages/pt-BR";

// SA7b: correções da H-SA no painel (fidelidade ao SA0).

/** Todos os textos de um nó do catálogo, com o caminho de cada um. */
function texts(node: unknown, path = ""): [string, string][] {
  if (typeof node === "string") return [[path, node]];
  if (Array.isArray(node)) return node.flatMap((v, i) => texts(v, `${path}.${i}`));
  if (node && typeof node === "object") return Object.entries(node).flatMap(([k, v]) => texts(v, path ? `${path}.${k}` : k));
  return [];
}

describe("H-SA-03: texto de tela do painel não promete fatia", () => {
  it.each([
    ["pt-BR", messages],
    ["en", en],
    ["es", es],
  ])("nenhum texto do catálogo admin (%s) cita código de fatia (SA1, SA6…)", (_locale, catalog) => {
    const hits = texts((catalog as Record<string, unknown>).admin).filter(([, v]) => /\bSA\d/.test(v));
    expect(hits).toEqual([]);
  });

  it("Pagamentos diz o que existe hoje, como o SA0, sem a promessa de reprocessar e conciliar", () => {
    expect(messages.admin.pagamentos.desc).toBe("Assinaturas, recargas, webhooks e conciliação, por provedor. As contas no Asaas e no Mercado Pago ainda não existem.");
    expect(en.admin.pagamentos.desc).not.toMatch(/arrive/);
    expect(es.admin.pagamentos.desc).not.toMatch(/llegan/);
  });
});
