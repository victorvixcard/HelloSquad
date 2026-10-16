import "./site-server";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { LOCALES, type Locale } from "@/i18n/config";
import { parseInline, plainText } from "@/lib/inline-markdown";
import { AI_CRAWLERS, llmsText, robotsText } from "@/lib/site-crawl";
import { getSiteContent, questionsOf } from "@/lib/site-content";
import { SITE_PAGE_KEYS, siteLanguages, sitePath, type SitePageKey } from "@/lib/site-routes";
import { jsonLdHtml, siteJsonLd, siteMetadata } from "@/lib/site-seo";
import { buildLocale } from "../scripts/site-content.mjs";

const URL_BASE = "http://127.0.0.1:3100";
const CASES = LOCALES.flatMap((locale) => SITE_PAGE_KEYS.map((key) => [locale, key] as [Locale, SitePageKey]));

type Node = Record<string, unknown> & { "@type": string };
async function graphOf(locale: Locale, key: SitePageKey): Promise<Node[]> {
  // O que vai para o HTML: serializado e lido de volta, como um robô leria.
  const parsed = JSON.parse(jsonLdHtml(await siteJsonLd(locale, key)));
  expect(parsed["@context"]).toBe("https://schema.org");
  return parsed["@graph"];
}
const byType = (graph: Node[], type: string) => graph.find((node) => node["@type"] === type);

describe("conteúdo do site (N2a)", () => {
  it("o JSON commitado é o que o gerador produz hoje a partir dos .md da N2a", () => {
    for (const locale of LOCALES) {
      const file = path.resolve(__dirname, `../content/site/${locale}.json`);
      expect(JSON.parse(readFileSync(file, "utf8"))).toEqual(buildLocale(locale));
    }
  });

  it("a tabela de rotas bate com a rota de cada arquivo da N2a, nos três idiomas", async () => {
    for (const [locale, key] of CASES) {
      const content = await getSiteContent(locale);
      expect(content.pages[key]?.path, `${locale}/${key}`).toBe(sitePath(key, locale));
    }
  });

  it("sem preço, sem fornecedor e sem marcador do dono no texto público", async () => {
    const vendors = /\b(instagram|facebook|meta ads|whatsapp|tiktok|google|youtube|linkedin|chatgpt|openai|anthropic|claude|gemini|hellootto)\b/i;
    const price = /R\$|US\$|€|\bgr[áa]tis\b|\bfree\b|\bgratis\b|\bpre[çc]o\b|\bplano (?:mensal|anual)\b/i;
    for (const locale of LOCALES) {
      const text = JSON.stringify(await getSiteContent(locale));
      expect(text, locale).not.toMatch(vendors);
      expect(text, locale).not.toMatch(price);
      expect(text, locale).not.toContain("{{");
    }
  });
});

describe("Metadata API por rota", () => {
  it.each(CASES)("%s %s: title ≤ 60, description ≤ 155, canônico, hreflang e imagem", async (locale, key) => {
    const meta = await siteMetadata(locale, key);
    const title = (meta.title as { absolute: string }).absolute;
    expect(title.length).toBeLessThanOrEqual(60);
    expect(meta.description!.length).toBeLessThanOrEqual(155);
    expect(title).toContain("HelloSquad");
    expect(meta.alternates?.canonical).toBe(sitePath(key, locale));
    expect(meta.alternates?.languages).toEqual({
      "pt-BR": sitePath(key, "pt-BR"),
      en: sitePath(key, "en"),
      es: sitePath(key, "es"),
      "x-default": sitePath(key, "pt-BR"),
    });
    const og = meta.openGraph as { url: string; images: { url: string; width: number; height: number }[] };
    expect(og.url).toBe(sitePath(key, locale));
    expect(og.images[0]).toMatchObject({ url: `/og/${locale}/${key}`, width: 1200, height: 630 });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image", images: [`/og/${locale}/${key}`] });
  });
});

describe("JSON-LD por rota (README da N2a §5)", () => {
  it.each(LOCALES)("%s: a inicial tem Organization, WebSite e SoftwareApplication, sem Offer", async (locale) => {
    const graph = await graphOf(locale, "inicio");
    const org = byType(graph, "Organization")!;
    expect(org).toMatchObject({ "@id": `${URL_BASE}/#organization`, name: "HelloSquad", url: `${URL_BASE}/` });
    expect((org.logo as { url: string }).url).toBe(`${URL_BASE}/logo-hellosquad.png`);
    expect(org.description).toMatch(/HelloSquad/);
    expect(byType(graph, "WebSite")).toMatchObject({ name: "HelloSquad", inLanguage: ["pt-BR", "en", "es"] });
    const app = byType(graph, "SoftwareApplication")!;
    expect(app).toMatchObject({ name: "HelloSquad", applicationCategory: "BusinessApplication", operatingSystem: "Web" });
    expect((app.featureList as string[]).length).toBe(6);
    // Preço por último (decisão do dono, 16/10): nenhum Offer em lugar nenhum do site.
    for (const key of SITE_PAGE_KEYS) expect(jsonLdHtml(await siteJsonLd(locale, key))).not.toMatch(/"offers"|"Offer"|"price"/);
  });

  it.each(CASES.filter(([, key]) => key !== "inicio"))("%s %s: BreadcrumbList até a própria página", async (locale, key) => {
    const crumbs = byType(await graphOf(locale, key), "BreadcrumbList")!;
    const items = crumbs.itemListElement as { position: number; name: string; item: string }[];
    expect(items.map((i) => i.position)).toEqual(items.map((_, i) => i + 1));
    expect(items[0]!.item).toBe(locale === "pt-BR" ? `${URL_BASE}/` : `${URL_BASE}/${locale}`);
    expect(items.at(-1)!.item).toBe(`${URL_BASE}${sitePath(key, locale)}`);
    expect(items.length).toBe(key.startsWith("squad-") ? 3 : 2);
    for (const item of items) expect(item.name.length).toBeGreaterThan(1);
  });

  it.each(LOCALES)("%s: Service por agente, ligado à Organization", async (locale) => {
    for (const key of SITE_PAGE_KEYS.filter((k) => k.startsWith("squad-"))) {
      const service = byType(await graphOf(locale, key), "Service")!;
      expect(service["@id"]).toBe(`${URL_BASE}${sitePath(key, locale)}#service`);
      expect(service.provider).toEqual({ "@id": `${URL_BASE}/#organization` });
      expect(service.name).toMatch(/^[A-ZÍ][a-z]+, /);
      expect(String(service.serviceType).length).toBeGreaterThan(3);
      expect(service.url).toBe(`${URL_BASE}${sitePath(key, locale)}`);
      expect(service.availableLanguage).toEqual(["pt-BR", "en", "es"]);
    }
  });

  it.each(LOCALES)("%s: FAQPage com as perguntas da página, em texto puro e idêntico ao visível", async (locale) => {
    const faq = byType(await graphOf(locale, "faq"), "FAQPage")!;
    const questions = questionsOf((await getSiteContent(locale)).pages.faq);
    const entities = faq.mainEntity as { "@type": string; name: string; acceptedAnswer: { text: string } }[];
    expect(entities.length).toBe(questions.length);
    expect(entities.length).toBeGreaterThanOrEqual(19);
    entities.forEach((entity, i) => {
      expect(entity["@type"]).toBe("Question");
      expect(entity.name).toBe(plainText(questions[i]!.question));
      expect(entity.acceptedAnswer.text.length).toBeGreaterThan(40);
      expect(entity.acceptedAnswer.text).not.toMatch(/\*\*|\]\(/);
    });
  });

  it.each(LOCALES)("%s: ItemList dos sete no squad; WebPage e AboutPage com about", async (locale) => {
    const list = byType(await graphOf(locale, "squad"), "ItemList")!;
    expect(list.numberOfItems).toBe(7);
    expect((list.itemListElement as unknown[]).length).toBe(7);
    expect(byType(await graphOf(locale, "como-funciona"), "WebPage")).toMatchObject({
      about: { "@id": `${URL_BASE}/#app` },
      isPartOf: { "@id": `${URL_BASE}/#website` },
      inLanguage: locale,
    });
    expect(byType(await graphOf(locale, "sobre"), "AboutPage")).toMatchObject({ about: { "@id": `${URL_BASE}/#organization` } });
  });

  it("o JSON-LD não abre brecha para fechar o <script>", () => {
    expect(jsonLdHtml({ a: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});

describe("rastreio: sitemap, robots.txt e llms.txt", () => {
  it("sitemap: as doze páginas nos três idiomas, cada uma com as quatro alternativas, e nada da área logada", () => {
    const entries = sitemap();
    const site = entries.filter((e) => !e.url.endsWith("/criar-conta"));
    expect(site.length).toBe(SITE_PAGE_KEYS.length * 3);
    for (const entry of site) expect(Object.keys(entry.alternates!.languages!)).toEqual(["pt-BR", "en", "es", "x-default"]);
    expect(entries.map((e) => e.url).filter((u) => /\/(app|admin|entrar|sair)(\/|$)/.test(u))).toEqual([]);
    expect(siteLanguages("squad-iris")["x-default"]).toBe("/squad/iris");
  });

  it("robots.txt: /app, /admin e /sair bloqueados para todos, Disallow antes de Allow, os robôs de IA nomeados", () => {
    const text = robotsText(URL_BASE);
    for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) expect(text).toContain(`User-Agent: ${bot}`);
    expect(AI_CRAWLERS.length).toBe(10);
    const groups = text.split("\n\n").filter((g) => g.startsWith("User-Agent"));
    expect(groups.length).toBe(2);
    for (const group of groups) {
      for (const path of ["/app", "/admin", "/sair"]) expect(group).toContain(`Disallow: ${path}\n`);
      expect(group.indexOf("Allow: /")).toBeGreaterThan(group.lastIndexOf("Disallow:"));
    }
    expect(text).toContain(`Sitemap: ${URL_BASE}/sitemap.xml`);
  });

  it("llms.txt: o texto da N2a com os links absolutos", () => {
    const text = llmsText(URL_BASE);
    expect(text.startsWith("# HelloSquad")).toBe(true);
    expect(text).toContain(`[Como funciona](${URL_BASE}/como-funciona)`);
    expect(text).toContain(`[Otto](${URL_BASE}/en/squad/otto)`);
    expect(text).not.toMatch(/\]\(\//);
  });
});

describe("marcação de linha do conteúdo", () => {
  it("negrito, itálico e link viram nós; o texto puro é o que se lê", () => {
    expect(parseInline("[**Nexo**](/squad/nexo) e *exemplo*")).toEqual([
      { kind: "link", href: "/squad/nexo", children: [{ kind: "strong", children: [{ kind: "text", text: "Nexo" }] }] },
      { kind: "text", text: " e " },
      { kind: "em", children: [{ kind: "text", text: "exemplo" }] },
    ]);
    expect(plainText("**Entrega pontual**: *Exemplo fictício.* [Bia](/squad/bia)")).toBe("Entrega pontual: Exemplo fictício. Bia");
    expect(plainText("<b>sem HTML</b>")).toBe("<b>sem HTML</b>");
  });
});
