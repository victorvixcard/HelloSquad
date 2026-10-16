import { Agent, Button, SQUAD } from "@hellosquad/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { getSitePage, questionsOf } from "@/lib/site-content";
import { agentPageKey, sitePath } from "@/lib/site-routes";
import { siteJsonLd, siteMetadata } from "@/lib/site-seo";
import { Blocks, Inline } from "./Prose";
import { JsonLd, SiteFooter, SiteHeader } from "./SiteChrome";
import "@/app/site.css";

/** Metadados da página inicial num idioma: os da N2a (inicio.md), canônico próprio e `hreflang` para as três versões. */
export async function landingMetadata(locale: Locale): Promise<Metadata> {
  return siteMetadata(locale, "inicio");
}

// Comparativo da R32 ("Mais do que ferramentas"): HelloSquad, softwares tradicionais e assistentes de IA genéricos.
const COMPARE: [CompareRow, Mark, Mark, Mark][] = [
  ["coordinates", "yes", "no", "no"],
  ["memory", "yes", "partial", "partial"],
  ["creates", "yes", "partial", "yes"],
  ["routines", "yes", "no", "no"],
  ["results", "yes", "no", "no"],
  ["actions", "yes", "no", "no"],
];
type Mark = "yes" | "partial" | "no";
type CompareRow = "coordinates" | "memory" | "creates" | "routines" | "results" | "actions";
const MARK_GLYPH: Record<Mark, string> = { yes: "✓", partial: "½", no: "–" };
const MARK_LABEL: Record<Mark, "compareYes" | "comparePartial" | "compareNo"> = { yes: "compareYes", partial: "comparePartial", no: "compareNo" };

// Perguntas da landing: as da R32 sem a de créditos (1, 2, 7, 8, 9 e 12 da /faq, inicio.md §9).
const LANDING_QUESTIONS = [0, 1, 6, 7, 8, 11];

/** A página pública do HelloSquad num idioma (ADR-0010): `/` em pt-BR, `/en` e `/es`. Hero da R32 sem mudança. */
export async function Landing({ locale }: { locale: Locale }) {
  const [t, tc, tl, ta, ld, faq] = await Promise.all([
    getTranslations({ locale, namespace: "site" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "site.landing" }),
    getTranslations({ locale, namespace: "auth.signUp" }),
    siteJsonLd(locale, "inicio"),
    getSitePage(locale, "faq"),
  ]);
  const questions = questionsOf(faq);
  return (
    <div className="hm" lang={locale}>
      <a className="hs-skip" href="#conteudo">
        {t("home.skipToContent")}
      </a>
      <JsonLd data={ld} />
      <SiteHeader locale={locale} current="inicio" />
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
                <Agent agent={m.id} size={52} title={`${m.name}, ${tc(`areas.${m.id}`)}`} />
              </li>
            ))}
          </ul>
        </section>
        <section className="lp-sec" aria-labelledby="lp-fluxo">
          <h2 id="lp-fluxo">
            {tl("flowTitleLine1")}
            <br />
            {tl("flowTitleLine2")}
          </h2>
          <p>{tl("flowLead")}</p>
          <ol className="lp-steps">
            {(["flowStep1", "flowStep2", "flowStep3", "flowStep4"] as const).map((step) => (
              <li key={step}>{tl(step)}</li>
            ))}
          </ol>
          <Link className="lp-link" href={sitePath("como-funciona", locale)}>
            {tl("flowLink")}
          </Link>
        </section>
        <section className="hm-squad" aria-labelledby="hm-squad-titulo">
          <h2 id="hm-squad-titulo">
            {t("home.squadTitleLine1")}
            <br />
            {t("home.squadTitleLine2")}
          </h2>
          <p className="st-squad-lead">{tl("squadLead")}</p>
          <dl className="hm-list">
            {SQUAD.map((m) => (
              <div key={m.id} className="hm-item">
                <dt>
                  <Agent agent={m.id} size="padrao" />
                  <span>
                    <Link className="lp-agent" href={sitePath(agentPageKey(m.id), locale)}>
                      <b>{m.name}</b>
                    </Link>{" "}
                    · {tc(`areas.${m.id}`)}
                  </span>
                </dt>
                <dd>{t(`responsibilities.${m.id}`)}</dd>
              </div>
            ))}
          </dl>
          <p className="hm-note">{t("home.note")}</p>
        </section>
        <section className="lp-sec" aria-labelledby="lp-auto">
          <div className="lp-band">
            <h2 id="lp-auto">{tl("autoTitle")}</h2>
            <p>{tl("autoText")}</p>
          </div>
        </section>
        <div className="lp-sec lp-grid">
          <section className="lp-card" aria-labelledby="lp-memoria">
            <h2 id="lp-memoria">
              {tl("memoryTitleLine1")} {tl("memoryTitleLine2")}
            </h2>
            <p>{tl("memoryLead")}</p>
            <p>{tl("memoryText")}</p>
          </section>
          <section className="lp-card" aria-labelledby="lp-resultados">
            <h2 id="lp-resultados">
              {tl("resultsTitleLine1")} {tl("resultsTitleLine2")}
            </h2>
            <p>{tl("resultsText")}</p>
          </section>
        </div>
        <section className="lp-sec" aria-labelledby="lp-comparativo">
          <h2 id="lp-comparativo">
            {tl("compareTitleLine1")}
            <br />
            {tl("compareTitleLine2")}
          </h2>
          <div className="st-table lp-compare" role="region" aria-labelledby="lp-comparativo" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th scope="col">{tl("compareWhat")}</th>
                  <th scope="col">
                    HelloSquad<small>{tl("compareUsSub")}</small>
                  </th>
                  <th scope="col">{tl("compareSoftware")}</th>
                  <th scope="col">{tl("compareAssistants")}</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([row, ...marks]) => (
                  <tr key={row}>
                    <th scope="row">{tl(`compareRows.${row}`)}</th>
                    {marks.map((mark, i) => (
                      <td key={i}>
                        <span className={`lp-mark is-${mark}`} aria-hidden="true">
                          {MARK_GLYPH[mark]}
                        </span>
                        <span className="sr-only">{tl(MARK_LABEL[mark])}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="lp-sec lp-faq" aria-labelledby="lp-perguntas">
          <h2 id="lp-perguntas">{tl("faqTitle")}</h2>
          {LANDING_QUESTIONS.map((index) => questions[index])
            .filter((qa) => qa !== undefined)
            .map((qa) => (
              <details key={qa.question}>
                <summary>
                  <Inline text={qa.question} />
                </summary>
                <Blocks blocks={qa.answer} />
              </details>
            ))}
          <p>
            <Link className="lp-link" href={sitePath("faq", locale)}>
              {tl("faqAll")}
            </Link>
          </p>
        </section>
        <section className="lp-sec lp-close" aria-label={t("cta")}>
          {/* Linha de apoio da R32 (modal de cadastro), a mesma do catálogo de cadastro. */}
          <p>{ta("lead")}</p>
          <Button href="/criar-conta" linkAs={Link}>
            {t("cta")}
          </Button>
        </section>
      </main>
      <SiteFooter locale={locale} page="inicio" />
    </div>
  );
}
