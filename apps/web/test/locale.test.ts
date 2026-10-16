import { describe, expect, it } from "vitest";
import { icuArguments, icuTags } from "@/i18n/icu";
import { PUBLIC_LOCALE_PATHS, publicLocaleOf, resolveLocale, userLocaleFromClaims } from "@/i18n/resolve";

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

  it("a / (estática) e as outras rotas não passam idioma pela rota", () => {
    expect(publicLocaleOf("/")).toBeNull();
    expect(publicLocaleOf("/app")).toBeNull();
    expect(publicLocaleOf("/en/app")).toBeNull();
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
