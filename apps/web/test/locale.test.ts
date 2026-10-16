import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { currentWeek } from "@/components/env/week";
import { icuArguments, icuTags } from "@/i18n/icu";
import { PUBLIC_LOCALE_PATHS, publicLocaleOf, resolveLocale, userLocaleFromClaims } from "@/i18n/resolve";
import enMessages from "@/messages/en";
import esMessages from "@/messages/es";
import ptBR from "@/messages/pt-BR";

describe("resolveLocale: pessoa → negócio → pt-BR (ADR-0010)", () => {
  it("a escolha da pessoa vence a do negócio", () => {
    expect(resolveLocale({ user: "en", workspace: "es" })).toEqual({ locale: "en", source: "user" });
  });

  it("sem escolha da pessoa, vale o idioma do negócio", () => {
    expect(resolveLocale({ user: null, workspace: "es" })).toEqual({ locale: "es", source: "workspace" });
    expect(resolveLocale({ workspace: "en" })).toEqual({ locale: "en", source: "workspace" });
  });

  it("sem nenhum dos dois, pt-BR", () => {
    expect(resolveLocale({})).toEqual({ locale: "pt-BR", source: "default" });
  });

  it("idioma fora de pt-BR, en e es é ignorado e cai no próximo", () => {
    expect(resolveLocale({ user: "fr", workspace: "es" })).toEqual({ locale: "es", source: "workspace" });
    expect(resolveLocale({ user: "EN", workspace: "pt" })).toEqual({ locale: "pt-BR", source: "default" });
    expect(resolveLocale({ user: 42, workspace: { locale: "en" } })).toEqual({ locale: "pt-BR", source: "default" });
  });
});

describe("userLocaleFromClaims: user_metadata.locale da Auth", () => {
  it("lê o idioma guardado na conta", () => {
    expect(userLocaleFromClaims({ sub: "u1", user_metadata: { locale: "es" } })).toBe("es");
  });

  it("sem sessão, sem metadado ou com valor inválido, nada", () => {
    expect(userLocaleFromClaims(undefined)).toBeNull();
    expect(userLocaleFromClaims({ sub: "u1" })).toBeNull();
    expect(userLocaleFromClaims({ sub: "u1", user_metadata: { locale: "de" } })).toBeNull();
    expect(userLocaleFromClaims({ sub: "u1", user_metadata: "en" })).toBeNull();
  });
});

describe("rotas públicas por idioma", () => {
  it("/ é pt-BR; /en e /es são as traduções", () => {
    expect(PUBLIC_LOCALE_PATHS).toEqual({ "pt-BR": "/", en: "/en", es: "/es" });
    expect(publicLocaleOf("/en")).toBe("en");
    expect(publicLocaleOf("/es")).toBe("es");
  });

  it("as páginas abaixo de /en e /es levam o idioma do prefixo (A2c)", () => {
    expect(publicLocaleOf("/en/how-it-works")).toBe("en");
    expect(publicLocaleOf("/en/squad/otto")).toBe("en");
    expect(publicLocaleOf("/es/preguntas-frecuentes")).toBe("es");
    // Endereço que não existe abaixo do prefixo cai no 404 do próprio idioma.
    expect(publicLocaleOf("/en/app")).toBe("en");
  });

  it("a / (estática), o pt-BR sem prefixo e as outras rotas não passam idioma pela rota", () => {
    expect(publicLocaleOf("/")).toBeNull();
    expect(publicLocaleOf("/squad/otto")).toBeNull();
    expect(publicLocaleOf("/app")).toBeNull();
    // Prefixo é segmento inteiro: /english e /esqueci-a-senha não são en nem es.
    expect(publicLocaleOf("/english")).toBeNull();
    expect(publicLocaleOf("/esqueci-a-senha")).toBeNull();
  });
});

describe("icuArguments: argumentos de uma mensagem do catálogo", () => {
  it("argumento simples, plural com # e select com argumentos dentro das opções", () => {
    expect([...icuArguments("Hello, {name}.")]).toEqual(["name"]);
    expect([...icuArguments("{count, plural, one {# aguarda você} other {# aguardam {who}}}")].sort()).toEqual(["count", "who"]);
    expect([...icuArguments("só {article, select, a {a} other {o}} {name} participa")].sort()).toEqual(["article", "name"]);
  });

  it("o texto das opções não vira argumento", () => {
    expect([...icuArguments("{article, select, a {ela} other {ele}}")]).toEqual(["article"]);
  });

  it("tags de texto rico", () => {
    expect([...icuTags("Fica assim: <code>/app/{slug}</code>")]).toEqual(["code"]);
  });
});

describe("frases montadas com nome de agente nos três idiomas (artigo só no pt-BR)", () => {
  const tr = (locale: "pt-BR" | "en" | "es", messages: object) => createTranslator({ locale, messages: messages as never });
  const pt = tr("pt-BR", ptBR);
  const en = tr("en", enMessages);
  const es = tr("es", esMessages);

  it("aviso de entrega: 'O Otto entregou a v2' / 'Otto delivered v2' / sem artigo em espanhol", () => {
    const args = { article: "o", name: "Otto", version: 2 };
    expect(pt("live.toastDelivered" as never, args as never)).toBe("O Otto entregou a v2");
    expect(en("live.toastDelivered" as never, args as never)).toBe("Otto delivered v2");
    expect(es("live.toastDelivered" as never, args as never)).not.toMatch(/\b[OA] Otto\b/);
  });

  it("referência ao agente: 'a Kaia' em pt-BR, só o nome em en e es", () => {
    const args = { article: "a", name: "Kaia" };
    expect(pt("common.agentRef" as never, args as never)).toBe("a Kaia");
    expect(en("common.agentRef" as never, args as never)).toBe("Kaia");
    expect(es("common.agentRef" as never, args as never)).toBe("Kaia");
  });

  it("conectivo da lista: em espanhol, 'y' vira 'e' antes de Íris", () => {
    expect(es("home.and" as never, { next: "iris" } as never)).toBe(" e ");
    expect(es("home.and" as never, { next: "bia" } as never)).toBe(" y ");
    expect(pt("home.and" as never, { next: "iris" } as never)).toBe(" e ");
    expect(en("home.and" as never, { next: "iris" } as never)).toBe(" and ");
  });
});

describe("datas por idioma (Intl, sem texto fixo)", () => {
  const friday = new Date("2026-10-16T12:00:00-03:00");

  it("semana do calendário editorial: 'out' em pt-BR, 'oct' em es, 'Oct' em en", () => {
    expect(currentWeek(friday, "pt-BR")).toMatchObject({ from: 12, to: 18, month: "out", sameMonth: true });
    expect(currentWeek(friday, "es").month).toBe("oct");
    expect(currentWeek(friday, "en").month).toBe("Oct");
  });

  it("dia e mês na ordem de cada idioma", () => {
    const dm = (locale: string) => new Intl.DateTimeFormat(locale, { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(friday);
    expect(dm("pt-BR")).toBe("16/10");
    expect(dm("es")).toBe("16/10");
    expect(dm("en")).toBe("10/16");
  });
});
