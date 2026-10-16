import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

// Sem `robots` aqui: o Next já põe o noindex em toda resposta 404 (H2-26, uma meta robots só).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("site.notFound");
  return { title: t("metaTitle") };
}

export default async function NotFound() {
  const t = await getTranslations("site.notFound");
  return (
    <main id="conteudo" className="flex min-h-dvh items-center justify-center bg-papel px-4">
      <section className="hs-sheet" aria-labelledby="nf-titulo">
        <h1 id="nf-titulo">{t("title")}</h1>
        <p>{t("lead")}</p>
        <p className="hs-sheet-sub">
          {t.rich("next", {
            squad: (chunks) => (
              <Link className="hs-link" href="/app">
                {chunks}
              </Link>
            ),
            home: (chunks) => (
              <Link className="hs-link" href="/">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </section>
    </main>
  );
}
