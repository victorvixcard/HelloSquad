import { describe, expect, it, vi } from "vitest";
import { resolveRequestLocale, workspaceLocaleFromCookie, workspaceSlugOf } from "@/i18n/resolve";

// H2-04: na área logada o idioma segue pessoa → negócio da rota → pt-BR (ADR-0010).
describe("resolveRequestLocale: idioma da tela na área logada", () => {
  const api = (locale: unknown) => vi.fn(async () => locale);

  it("a pessoa com idioma vence o negócio e nem pergunta à API", async () => {
    const workspaceLocale = api("en");
    const out = await resolveRequestLocale({ user: "es", pathname: "/app/vitta", cookie: undefined, workspaceLocale });
    expect(out).toEqual({ locale: "es", source: "user", cookie: null });
    expect(workspaceLocale).not.toHaveBeenCalled();
  });

  it("pessoa sem idioma num negócio en vê en e guarda o idioma do negócio no cookie", async () => {
    const workspaceLocale = api("en");
    const out = await resolveRequestLocale({ user: null, pathname: "/app/vitta/projetos", cookie: undefined, workspaceLocale });
    expect(out).toEqual({ locale: "en", source: "workspace", cookie: "vitta:en" });
    expect(workspaceLocale).toHaveBeenCalledWith("vitta");
  });

  it("com o cookie do mesmo negócio, não pergunta à API; cookie de outro negócio não vale", async () => {
    const cached = api("pt-BR");
    expect(await resolveRequestLocale({ user: null, pathname: "/app/vitta", cookie: "vitta:en", workspaceLocale: cached })).toEqual({
      locale: "en",
      source: "workspace",
      cookie: null,
    });
    expect(cached).not.toHaveBeenCalled();
    const other = api("es");
    const out = await resolveRequestLocale({ user: null, pathname: "/app/miolo", cookie: "vitta:en", workspaceLocale: other });
    expect(out).toEqual({ locale: "es", source: "workspace", cookie: "miolo:es" });
  });

  it("sem nada (sem idioma da pessoa, sem negócio na rota ou API fora), pt-BR e sem cookie", async () => {
    const none = api(null);
    expect(await resolveRequestLocale({ user: null, pathname: "/app", cookie: undefined, workspaceLocale: none })).toEqual({
      locale: "pt-BR",
      source: "default",
      cookie: null,
    });
    expect(await resolveRequestLocale({ user: null, pathname: "/app/novo-workspace", cookie: undefined, workspaceLocale: none })).toEqual(
      { locale: "pt-BR", source: "default", cookie: null },
    );
    expect(await resolveRequestLocale({ user: null, pathname: "/entrar", cookie: undefined, workspaceLocale: none })).toEqual({
      locale: "pt-BR",
      source: "default",
      cookie: null,
    });
    expect(none).not.toHaveBeenCalled();
    expect(await resolveRequestLocale({ user: null, pathname: "/app/vitta", cookie: undefined, workspaceLocale: none })).toEqual({
      locale: "pt-BR",
      source: "default",
      cookie: null,
    });
    const down = vi.fn(async () => {
      throw new Error("API fora");
    });
    expect(await resolveRequestLocale({ user: undefined, pathname: "/app/vitta", cookie: undefined, workspaceLocale: down })).toEqual({
      locale: "pt-BR",
      source: "default",
      cookie: null,
    });
  });

  it("idioma fora de pt-BR, en e es é ignorado (na pessoa, no cookie e na API)", async () => {
    const out = await resolveRequestLocale({ user: "fr", pathname: "/app/vitta", cookie: "vitta:de", workspaceLocale: api("it") });
    expect(out).toEqual({ locale: "pt-BR", source: "default", cookie: null });
  });
});

describe("slug do negócio e cookie do idioma", () => {
  it("lê o slug só de /app/<slug>", () => {
    expect(workspaceSlugOf("/app/vitta")).toBe("vitta");
    expect(workspaceSlugOf("/app/vitta/memoria-da-marca")).toBe("vitta");
    expect(workspaceSlugOf("/app")).toBeNull();
    expect(workspaceSlugOf("/app/")).toBeNull();
    expect(workspaceSlugOf("/app/novo-workspace")).toBeNull();
    expect(workspaceSlugOf("/entrar")).toBeNull();
  });

  it("o cookie vale só para o mesmo slug e um idioma conhecido", () => {
    expect(workspaceLocaleFromCookie("vitta:en", "vitta")).toBe("en");
    expect(workspaceLocaleFromCookie("vitta:pt-BR", "vitta")).toBe("pt-BR");
    expect(workspaceLocaleFromCookie("vitta:en", "miolo")).toBeNull();
    expect(workspaceLocaleFromCookie("vitta:xx", "vitta")).toBeNull();
    expect(workspaceLocaleFromCookie("vitta", "vitta")).toBeNull();
    expect(workspaceLocaleFromCookie(undefined, "vitta")).toBeNull();
  });
});
