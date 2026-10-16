import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LOCALES, type Locale } from "@/i18n/config";
import { jsonLdHtml } from "@/lib/site-seo";
import { sitePath, type SitePageKey } from "@/lib/site-routes";

// Cabeçalho, rodapé, migalhas e JSON-LD comuns às páginas públicas (landing incluída). Classes hm-* da landing (home.css)
// e st-* do site (site.css).

const NAV = [
  ["como-funciona", "nav.howItWorks"],
  ["squad", "nav.squad"],
  ["faq", "nav.faq"],
  ["sobre", "nav.about"],
] as const satisfies readonly (readonly [SitePageKey, string])[];

/**
 * Cabeçalho. Na landing (`nav={false}`) fica como a R32 no topo: wordmark e "Entrar". Nas páginas novas, que a R32 não
 * desenha, entra a navegação entre elas (que também está no rodapé de todas).
 */
export async function SiteHeader({ locale, current, nav = true }: { locale: Locale; current: SitePageKey; nav?: boolean }) {
  const t = await getTranslations({ locale, namespace: "site" });
  return (
    <header className={nav ? "hm-head st-head" : "hm-head"}>
      <Link href={sitePath("inicio", locale)} className="hs-wordmark hm-wm" aria-label={t("home.homeLink")}>
        HelloSquad
      </Link>
      {nav ? (
        <nav className="st-nav" aria-label={t("nav.label")}>
          <ul>
            {NAV.map(([key, label]) => (
              <li key={key}>
                <Link className="hm-link" href={sitePath(key, locale)} aria-current={current === key ? "page" : undefined}>
                  {t(label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <nav className="st-account" aria-label={t("home.accountNav")}>
        <Link className="hm-link" href="/entrar">
          {t("home.signIn")}
        </Link>
      </nav>
    </header>
  );
}

export async function SiteFooter({ locale, page }: { locale: Locale; page: SitePageKey }) {
  const [t, tc] = await Promise.all([
    getTranslations({ locale, namespace: "site" }),
    getTranslations({ locale, namespace: "common.localeNames" }),
  ]);
  return (
    <footer className="hm-foot">
      <span className="hs-wordmark hm-foot-wm">HelloSquad</span>
      <nav aria-label={t("home.footerNav")}>
        {NAV.map(([key, label]) => (
          <Link key={key} href={sitePath(key, locale)}>
            {t(label)}
          </Link>
        ))}
        <Link href="/criar-conta">{t("cta")}</Link>
        <Link href="/entrar">{t("home.signIn")}</Link>
      </nav>
      {/* Troca de idioma com navegação completa (<a>, não Link): o <html lang> vem do layout raiz, que a navegação do
          cliente não renderiza de novo. */}
      <nav className="st-langs" aria-label={t("languages")}>
        {LOCALES.map((other) => (
          <a
            key={other}
            href={sitePath(page, other)}
            hrefLang={other}
            lang={other}
            aria-current={other === locale ? "page" : undefined}
          >
            {tc(other)}
          </a>
        ))}
      </nav>
      <span className="hm-foot-end">{t("home.copyright")}</span>
    </footer>
  );
}

export async function Breadcrumbs({ locale, trail }: { locale: Locale; trail: { key: SitePageKey; name: string }[] }) {
  const t = await getTranslations({ locale, namespace: "site.crumbs" });
  return (
    <nav className="st-crumbs" aria-label={t("label")}>
      <ol>
        {trail.map((crumb, i) => (
          <li key={crumb.key}>
            {i < trail.length - 1 ? (
              <Link href={sitePath(crumb.key, locale)}>{crumb.name}</Link>
            ) : (
              <span aria-current="page">{crumb.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Dados estruturados no HTML inicial (os robôs de IA não executam JavaScript). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }} />;
}
