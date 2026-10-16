import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AGENT_IDS } from "@hellosquad/ui";
import { LOCALES, type Locale } from "@/i18n/config";
import { siteUrl } from "./env";
import { plainText } from "./inline-markdown";
import { getSiteContent, getSitePage, questionsOf, type SiteBlock } from "./site-content";
import { agentOf, agentPageKey, siteLanguages, sitePath, siteTrail, type SitePageKey } from "./site-routes";

// Metadados e dados estruturados do site público (docs/conteudo/site/README.md §4 e §5). Sem Offer: preço fica por
// último (decisão do dono, 16/10). Os @id ligam as entidades entre as páginas e os idiomas.

export const OG_SIZE = { width: 1200, height: 630 } as const;

export function ogImagePath(locale: Locale, key: SitePageKey): string {
  return `/og/${locale}/${key}`;
}

const ogLocale = (locale: Locale) => locale.replace("-", "_");

/** Metadata API de uma página: title e description da N2a, canônico próprio, hreflang, Open Graph e Twitter. */
export async function siteMetadata(locale: Locale, key: SitePageKey): Promise<Metadata> {
  const page = await getSitePage(locale, key);
  const path = sitePath(key, locale);
  const image = { url: ogImagePath(locale, key), ...OG_SIZE, alt: page.title };
  return {
    title: { absolute: page.title },
    description: page.description,
    alternates: { canonical: path, languages: siteLanguages(key) },
    openGraph: {
      type: "website",
      siteName: "HelloSquad",
      locale: ogLocale(locale),
      alternateLocale: LOCALES.filter((other) => other !== locale).map(ogLocale),
      title: page.title,
      description: page.description,
      url: path,
      images: [image],
    },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: [image.url] },
  };
}

/** Texto puro de uma resposta, na ordem da página (FAQPage pede o mesmo texto do visível). */
export function blocksText(blocks: SiteBlock[]): string {
  return blocks
    .flatMap((block) => {
      switch (block.type) {
        case "p":
          return [plainText(block.text)];
        case "table":
          return block.rows.map((row) => row.map(plainText).join(": "));
        case "qa":
          return [plainText(block.question), blocksText(block.answer)];
        default:
          return block.items.map(plainText);
      }
    })
    .join(" ");
}

type Node = Record<string, unknown>;

/** Nomes da trilha de migalhas (BreadcrumbList e a navegação visível usam os mesmos). */
export async function crumbNames(locale: Locale, key: SitePageKey): Promise<{ key: SitePageKey; name: string }[]> {
  const [t, content] = await Promise.all([getTranslations({ locale, namespace: "site.crumbs" }), getSiteContent(locale)]);
  const names: Record<string, string> = {
    inicio: t("inicio"),
    "como-funciona": t("comoFunciona"),
    squad: t("squad"),
    faq: t("faq"),
    sobre: t("sobre"),
  };
  return siteTrail(key).map((at) => {
    const agent = content.pages[at]?.agent;
    return { key: at, name: agent ? `${agent.nome}, ${agent.papel}` : names[at]! };
  });
}

/** JSON-LD de uma página, num `@graph` só (README da N2a §5). */
export async function siteJsonLd(locale: Locale, key: SitePageKey): Promise<Node> {
  const url = siteUrl();
  const abs = (path: string) => (path === "/" ? `${url}/` : `${url}${path}`);
  const ids = { organization: `${url}/#organization`, website: `${url}/#website`, app: `${url}/#app` };
  const [t, ts, content] = await Promise.all([
    getTranslations({ locale, namespace: "site.ld" }),
    getTranslations({ locale, namespace: "site" }),
    getSiteContent(locale),
  ]);
  const page = content.pages[key];
  const path = sitePath(key, locale);
  const audience = { "@type": "BusinessAudience", audienceType: t("audience") };
  const graph: Node[] = [];

  if (key === "inicio") {
    graph.push(
      {
        "@type": "Organization",
        "@id": ids.organization,
        name: "HelloSquad",
        url: `${url}/`,
        logo: { "@type": "ImageObject", url: `${url}/logo-hellosquad.png`, width: 512, height: 512 },
        description: t("orgDescription"),
        slogan: `${ts("home.heroLine1")} ${ts("home.heroLine2")}`,
        knowsAbout: (["k1", "k2", "k3", "k4", "k5", "k6", "k7"] as const).map((k) => t(`knowsAbout.${k}`)),
      },
      {
        "@type": "WebSite",
        "@id": ids.website,
        url: `${url}/`,
        name: "HelloSquad",
        inLanguage: [...LOCALES],
        publisher: { "@id": ids.organization },
      },
      {
        "@type": "SoftwareApplication",
        "@id": ids.app,
        name: "HelloSquad",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: t("subCategory"),
        operatingSystem: "Web",
        url: abs(path),
        inLanguage: [...LOCALES],
        description: t("appDescription"),
        audience,
        featureList: (["f1", "f2", "f3", "f4", "f5", "f6"] as const).map((f) => t(`features.${f}`)),
        publisher: { "@id": ids.organization },
      },
    );
  } else {
    const crumbs = await crumbNames(locale, key);
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: abs(sitePath(crumb.key, locale)),
      })),
    });
  }

  if (key === "squad") {
    graph.push({
      "@type": "ItemList",
      name: t("squadList"),
      itemListOrder: "https://schema.org/ItemListUnordered",
      numberOfItems: AGENT_IDS.length,
      itemListElement: AGENT_IDS.map((id, index) => {
        const agent = content.pages[agentPageKey(id)]?.agent;
        return {
          "@type": "ListItem",
          position: index + 1,
          url: abs(sitePath(agentPageKey(id), locale)),
          name: agent ? `${agent.nome}, ${agent.papel}` : id,
        };
      }),
    });
  }

  const agent = agentOf(key);
  if (agent && page?.agent) {
    graph.push({
      "@type": "Service",
      "@id": `${abs(path)}#service`,
      name: `${page.agent.nome}, ${page.agent.papel}`,
      serviceType: t(`serviceType.${agent}`),
      description: page.description,
      provider: { "@id": ids.organization },
      audience,
      availableLanguage: [...LOCALES],
      url: abs(path),
    });
  }

  if (key === "faq" && page) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${abs(path)}#faq`,
      inLanguage: locale,
      mainEntity: questionsOf(page).map((qa) => ({
        "@type": "Question",
        name: plainText(qa.question),
        acceptedAnswer: { "@type": "Answer", text: blocksText(qa.answer) },
      })),
    });
  }

  if ((key === "como-funciona" || key === "sobre") && page) {
    graph.push({
      "@type": key === "sobre" ? "AboutPage" : "WebPage",
      "@id": `${abs(path)}#webpage`,
      name: page.title,
      inLanguage: locale,
      about: { "@id": key === "sobre" ? ids.organization : ids.app },
      isPartOf: { "@id": ids.website },
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

/** Serializa para o `<script type="application/ld+json">` sem abrir brecha para `</script>`. */
export function jsonLdHtml(data: Node): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
