import { Agent, Button, SQUAD } from "@hellosquad/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { siteUrl } from "@/lib/env";
import { openGraphBase } from "@/lib/site";
import "./home.css";

export async function generateMetadata(): Promise<Metadata> {
  return {
    alternates: { canonical: "/", languages: { "pt-BR": "/" } },
    openGraph: { ...(await openGraphBase()), url: "/" },
  };
}

async function jsonLd() {
  const url = siteUrl();
  const [t, locale] = await Promise.all([getTranslations("site"), getLocale()]);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}/#organizacao`,
        name: "HelloSquad",
        url: `${url}/`,
        description: t("meta.description"),
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${url}/#aplicativo`,
        name: "HelloSquad",
        url: `${url}/`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: locale,
        description: t("definition"),
        publisher: { "@id": `${url}/#organizacao` },
        featureList: SQUAD.map((m) => `${m.name}, ${m.area}: ${t(`responsibilities.${m.id}`)}`),
      },
    ],
  };
}

export default async function Home() {
  const t = await getTranslations("site");
  const ld = await jsonLd();
  return (
    <div className="hm">
      <a className="hs-skip" href="#conteudo">
        {t("home.skipToContent")}
      </a>
      <script
        type="application/ld+json"
        // JSON-LD estático, montado no servidor a partir do catálogo e de constantes do repositório.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }}
      />
      <header className="hm-head">
        <Link href="/" className="hs-wordmark hm-wm" aria-label={t("home.homeLink")}>
          HelloSquad
        </Link>
        <nav aria-label={t("home.accountNav")}>
          <Link className="hm-link" href="/entrar">
            {t("home.signIn")}
          </Link>
        </nav>
      </header>
      <main id="conteudo">
        <section className="hm-hero" aria-labelledby="hm-titulo">
          <h1 id="hm-titulo">
            {t("home.heroLine1")}
            <br />
            <span>{t("home.heroLine2")}</span>
          </h1>
          <p className="hm-lead">{t("definition")}</p>
          <Button href="/criar-conta" linkAs={Link}>
            {t("home.signUp")}
          </Button>
          <ul className="hm-row" aria-label={t("home.squadRow")}>
            {SQUAD.map((m) => (
              <li key={m.id}>
                <Agent agent={m.id} size={52} title={`${m.name}, ${m.area}`} />
              </li>
            ))}
          </ul>
        </section>
        <section className="hm-squad" aria-labelledby="hm-squad-titulo">
          <h2 id="hm-squad-titulo">
            {t("home.squadTitleLine1")}
            <br />
            {t("home.squadTitleLine2")}
          </h2>
          <dl className="hm-list">
            {SQUAD.map((m) => (
              <div key={m.id} className="hm-item">
                <dt>
                  <Agent agent={m.id} size="padrao" />
                  <span>
                    <b>{m.name}</b> · {m.area}
                  </span>
                </dt>
                <dd>{t(`responsibilities.${m.id}`)}</dd>
              </div>
            ))}
          </dl>
          <p className="hm-note">{t("home.note")}</p>
        </section>
      </main>
      <footer className="hm-foot">
        <span className="hs-wordmark hm-foot-wm">HelloSquad</span>
        <nav aria-label={t("home.footerNav")}>
          <Link href="/criar-conta">{t("home.signUp")}</Link>
          <Link href="/entrar">{t("home.signIn")}</Link>
        </nav>
        <span className="hm-foot-end">{t("home.copyright")}</span>
      </footer>
    </div>
  );
}
