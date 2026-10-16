import { Agent } from "@hellosquad/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SignupForm } from "./SignupForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signUp");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/criar-conta" },
  };
}

// Dinâmica: o middleware manda o nonce da CSP a cada requisição (lib/security-headers.ts).
export const dynamic = "force-dynamic";

export default async function CriarContaPage() {
  const t = await getTranslations("auth.signUp");
  return (
    <section className="hs-sheet" aria-labelledby="criar-titulo">
      <Agent agent="nexo" size={40} expression="big" />
      <h1 id="criar-titulo">{t("title")}</h1>
      <p>{t("lead")}</p>
      <SignupForm />
      <p className="hs-sheet-sub">
        {t("hasAccount")}{" "}
        <Link className="hs-link" href="/entrar">
          {t("signInLink")}
        </Link>
      </p>
    </section>
  );
}
