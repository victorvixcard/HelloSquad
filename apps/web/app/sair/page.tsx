import { Button } from "@hellosquad/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { signOut } from "@/lib/auth-actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signOut");
  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  };
}

// Dinâmica: o middleware manda o nonce da CSP a cada requisição (lib/security-headers.ts).
export const dynamic = "force-dynamic";

// Sair é sempre um POST (formulário): um link ou prefetch nunca encerra a sessão por engano.
export default async function SairPage() {
  const t = await getTranslations("auth.signOut");
  return (
    <main id="conteudo" className="flex min-h-dvh items-center justify-center bg-papel px-4">
      <section className="hs-sheet" aria-labelledby="sair-titulo">
        <h1 id="sair-titulo">{t("title")}</h1>
        <p>{t("lead")}</p>
        <form action={signOut} className="flex flex-wrap items-center gap-3">
          <Button type="submit">{t("submit")}</Button>
          <Link className="hs-link" href="/app">
            {t("back")}
          </Link>
        </form>
      </section>
    </main>
  );
}
