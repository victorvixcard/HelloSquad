import { expect, test } from "@playwright/test";
import { snap } from "./helpers";

// Site público com SEO/GEO (A2c): as doze páginas da N2a nos três idiomas, metadados no <head> do HTML inicial (os
// robôs de IA não executam JavaScript), JSON-LD, sitemap, robots.txt e llms.txt; /app e /admin fora dos buscadores.

const AGENTS = ["nexo", "bia", "kaia", "otto", "kiwi", "max", "iris"];
const ROUTES: Record<"pt-BR" | "en" | "es", string[]> = {
  "pt-BR": ["/", "/como-funciona", "/squad", ...AGENTS.map((a) => `/squad/${a}`), "/faq", "/sobre"],
  en: ["/en", "/en/how-it-works", "/en/squad", ...AGENTS.map((a) => `/en/squad/${a}`), "/en/faq", "/en/about"],
  es: ["/es", "/es/como-funciona", "/es/squad", ...AGENTS.map((a) => `/es/squad/${a}`), "/es/preguntas-frecuentes", "/es/sobre"],
};

test.describe("site público (A2c)", () => {
  test("as doze páginas respondem 200 nos três idiomas, com lang, título, canônico, hreflang e JSON-LD no head", async ({
    request,
  }) => {
    for (const [locale, paths] of Object.entries(ROUTES)) {
      for (const path of paths) {
        // Como um robô de IA pede: sem JavaScript, só o HTML.
        const res = await request.get(path, { headers: { "User-Agent": "GPTBot/1.2" } });
        expect(res.status(), path).toBe(200);
        const html = await res.text();
        expect(html.match(/<html[^>]*\slang="([^"]+)"/)?.[1], path).toBe(locale);
        const head = html.slice(0, html.indexOf("</head>"));
        expect(head, path).toMatch(/<title>[^<]*HelloSquad[^<]*<\/title>/);
        expect(head, path).toContain('<meta name="description"');
        expect(head, path).toContain(`<link rel="canonical" href="`);
        for (const lang of ["pt-BR", "en", "es", "x-default"]) expect(head, `${path} ${lang}`).toContain(`hrefLang="${lang}"`);
        expect(head, path).toContain('<meta property="og:image"');
        const ld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]!));
        expect(ld.length, path).toBe(1);
        expect(JSON.stringify(ld[0])).not.toContain('"Offer"');
      }
    }
  });

  test("slug desconhecido dá 404 no idioma da rota", async ({ request }) => {
    expect((await request.get("/squad/zeca")).status()).toBe(404);
    expect((await request.get("/en/squad/zeca")).status()).toBe(404);
  });

  test("/app e /admin ficam fora dos buscadores; robots.txt, sitemap e llms.txt da N2a", async ({ request }) => {
    for (const path of ["/app", "/admin"]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.headers()["x-robots-tag"], path).toContain("noindex");
    }
    const robots = await (await request.get("/robots.txt")).text();
    for (const rule of ["Disallow: /app", "Disallow: /admin", "User-Agent: GPTBot", "User-Agent: ClaudeBot"]) expect(robots).toContain(rule);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap.match(/<url>/g)?.length).toBe(37);
    expect(sitemap).toContain('hreflang="x-default"');
    expect(sitemap).not.toMatch(/\/app<|\/admin|\/entrar/);
    const llms = await request.get("/llms.txt");
    expect(llms.headers()["content-type"]).toContain("text/plain");
    expect(await llms.text()).toMatch(/^# HelloSquad/);
    const og = await request.get("/og/es/squad-kiwi");
    expect(og.headers()["content-type"]).toBe("image/png");
  });

  test("no celular: página do agente com migalhas, conteúdo, botão sem preço e troca de idioma", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/squad/otto");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Otto, conteúdo e comunicação");
    await expect(page.getByRole("navigation", { name: "Você está aqui" })).toBeVisible();
    await expect(page.getByRole("table").first()).toBeVisible();
    await snap(page, "a2c-01-otto-celular");
    await page.getByRole("navigation", { name: "Idioma" }).getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en\/squad\/otto$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("link", { name: "Start with the squad" }).first()).toHaveAttribute("href", "/criar-conta");
    await snap(page, "a2c-02-otto-en-celular");
  });

  test("no computador: landing R32 portada, com o Hero que digita e envia sozinho; FAQ e squad", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Você cuida do seu negócio.");
    // L1: o motor do protótipo digita o primeiro pedido ~3 s depois de carregar e envia (fases is-ph-* no Hero).
    const field = page.locator(".lp-hero .hs-input");
    await expect(field).toHaveValue(/^Criar uma campanha/, { timeout: 8_000 });
    await expect(page.locator("#topo")).toHaveClass(/is-ph-/, { timeout: 8_000 });
    await snap(page, "l1-01-hero");
    await page.getByRole("button", { name: "Veja o Squad trabalhando" }).first().click();
    await expect(page.locator("#demo")).toBeInViewport({ timeout: 5_000 });
    await expect(page.getByRole("table", { name: /Comparação entre HelloSquad/ })).toHaveCount(1);
    // Sem fornecedor: o comparativo não leva marca de terceiros.
    await expect(page.locator("[data-brand]")).toHaveCount(0);
    // "Entrar" leva à tela real (no protótipo era um modal demonstrativo).
    await page.getByRole("banner").getByRole("link", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/entrar$/);
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("You run your business.");
    await page.goto("/faq");
    await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible();
    await snap(page, "a2c-04-faq");
    await page.goto("/es/squad");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await snap(page, "a2c-05-squad-es");
  });
});
