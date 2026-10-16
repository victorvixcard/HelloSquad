import { Agent } from "@hellosquad/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signIn");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/entrar" },
    robots: { index: false, follow: true },
  };
}

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; sessao?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next) ?? undefined;
  const t = await getTranslations("auth.signIn");
  return (
    <section className="hs-sheet" aria-labelledby="entrar-titulo">
      <Agent agent="nexo" size={40} expression="big" />
      <h1 id="entrar-titulo">{t("title")}</h1>
      <p>{t("lead")}</p>
      {params.sessao === "expirada" ? (
        <p className="hs-form-err" role="status">
          {t("sessionExpired")}
        </p>
      ) : null}
      <LoginForm next={next} />
      <p className="hs-sheet-sub">
        {t("noAccount")}{" "}
        <Link className="hs-link" href="/criar-conta">
          {t("signUpLink")}
        </Link>
      </p>
    </section>
  );
}
