import { Agent, AGENT_IDS, Button } from "@hellosquad/ui";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { getSiteContent, getSitePage } from "@/lib/site-content";
import { agentOf, agentPageKey, sitePath, type SitePageKey } from "@/lib/site-routes";
import { crumbNames, siteJsonLd, siteMetadata } from "@/lib/site-seo";
import { Blocks } from "./Prose";
import { Breadcrumbs, JsonLd, SiteFooter, SiteHeader } from "./SiteChrome";
import "@/app/home.css";
import "@/app/site.css";

export { siteMetadata };

/**
 * Uma página do site público (como funciona, squad, agente, perguntas, sobre) num idioma, com o texto da N2a
 * (docs/conteudo/site) no HTML inicial: definição na primeira dobra, seções curtas, tabelas em `<table>`.
 */
export async function SitePage({ locale, page: key }: { locale: Locale; page: SitePageKey }) {
  const [page, t, ld, trail, content] = await Promise.all([
    getSitePage(locale, key),
    getTranslations({ locale, namespace: "site" }),
    siteJsonLd(locale, key),
    crumbNames(locale, key),
    getSiteContent(locale),
  ]);
  const agent = agentOf(key);
  return (
    <div className="hm st" lang={locale}>
      <a className="hs-skip" href="#conteudo">
        {t("home.skipToContent")}
      </a>
      <JsonLd data={ld} />
      <SiteHeader locale={locale} current={key} />
      <main id="conteudo" className="st-main">
        <Breadcrumbs locale={locale} trail={trail} />
        <header className={agent ? "st-hero st-hero-agent" : "st-hero"}>
          {agent && page.agent ? (
            <p className="st-kicker">
              <Agent agent={agent} size={64} />
              <span>{t("agentArea", { name: page.agent.nome, area: page.agent.area })}</span>
            </p>
          ) : null}
          <h1>{page.h1}</h1>
          {page.tagline ? <p className="st-tagline">{agent ? <q>{page.tagline}</q> : page.tagline}</p> : null}
          {page.intro ? <Blocks blocks={page.intro} /> : null}
          {key === "squad" ? (
            <ul className="hm-row st-row">
              {AGENT_IDS.map((id) => {
                const member = content.pages[agentPageKey(id)]?.agent;
                const name = member ? `${member.nome}, ${member.papel}` : id;
                return (
                  <li key={id}>
                    <Link href={sitePath(agentPageKey(id), locale)} aria-label={name} title={name}>
                      <Agent agent={id} size={52} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </header>
        {(page.sections ?? []).map((section) => (
          <section key={section.id} id={section.id} className="st-sec" aria-labelledby={`${section.id}-titulo`}>
            <h2 id={`${section.id}-titulo`}>{section.title}</h2>
            <Blocks blocks={section.blocks} label={section.title} />
          </section>
        ))}
        {page.cta ? (
          <div className="st-cta">
            <Button href="/criar-conta" linkAs={Link}>
              {t("cta")}
            </Button>
          </div>
        ) : null}
      </main>
      <SiteFooter locale={locale} page={key} />
    </div>
  );
}
