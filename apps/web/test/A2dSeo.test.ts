import "./site-server";
import { describe, expect, it } from "vitest";
import { LOCALES, type Locale } from "@/i18n/config";
import { SITE_PAGE_KEYS, type SitePageKey } from "@/lib/site-routes";
import { jsonLdHtml, referencedIds, siteJsonLd } from "@/lib/site-seo";

const URL_BASE = "http://127.0.0.1:3100";
const CASES = LOCALES.flatMap((locale) => SITE_PAGE_KEYS.map((key) => [locale, key] as [Locale, SitePageKey]));

type Node = Record<string, unknown>;
async function graphOf(locale: Locale, key: SitePageKey): Promise<Node[]> {
  return JSON.parse(jsonLdHtml(await siteJsonLd(locale, key)))["@graph"];
}

// H2-26: cada @id citado no JSON-LD de uma página resolve na própria página (validador de uma página só).
describe("JSON-LD: @id citado resolve na mesma página", () => {
  it.each(CASES)("%s %s", async (locale, key) => {
    const graph = await graphOf(locale, key);
    const defined = graph.map((node) => node["@id"]).filter(Boolean);
    for (const id of referencedIds(graph)) expect(defined, `${locale} ${key}: ${id}`).toContain(id);
    // Um nó por @id: a página interna não repete o que já descreve.
    expect(new Set(defined).size).toBe(defined.length);
  });

  it("a página interna leva a Organization mínima (nome e endereço); a inicial segue com a completa", async () => {
    const service = await graphOf("en", "squad-otto");
    expect(service.find((n) => n["@id"] === `${URL_BASE}/#organization`)).toEqual({
      "@type": "Organization",
      "@id": `${URL_BASE}/#organization`,
      name: "HelloSquad",
      url: `${URL_BASE}/`,
    });
    const about = await graphOf("pt-BR", "sobre");
    expect(about.map((n) => n["@type"])).toEqual(expect.arrayContaining(["AboutPage", "Organization", "WebSite"]));
    const home = await graphOf("pt-BR", "inicio");
    expect(home.find((n) => n["@type"] === "Organization")).toHaveProperty("logo");
  });

  it("referencedIds acha só as referências, em qualquer nível", () => {
    expect(
      referencedIds([
        { "@type": "Service", "@id": "a", provider: { "@id": "org" } },
        { "@type": "WebPage", about: [{ "@id": "app" }, { "@id": "org" }], isPartOf: { "@id": "site" } },
      ]),
    ).toEqual(["org", "app", "site"]);
  });
});

// H2-26: o 404 não repete a meta robots que o Next já põe em toda resposta 404.
describe("404 com uma meta robots só", () => {
  it("o not-found não declara robots na Metadata", async () => {
    const { generateMetadata } = await import("@/app/not-found");
    const metadata = await generateMetadata();
    expect(metadata).not.toHaveProperty("robots");
    expect(metadata.title).toBeTruthy();
  });
});
