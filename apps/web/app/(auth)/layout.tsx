import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { clientMessages } from "@/i18n/client-messages";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("auth");
  return (
    <div className="flex min-h-dvh flex-col bg-papel">
      <a className="hs-skip" href="#conteudo">
        {t("skipToContent")}
      </a>
      <header className="flex h-16 items-center px-5 sm:px-8">
        <Link href="/" className="hs-wordmark text-[22px]" aria-label={t("homeLink")}>
          HelloSquad
        </Link>
      </header>
      <main id="conteudo" className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        {/* Os formulários de entrar e criar conta levam ao browser só o catálogo deles (H2-08). */}
        <NextIntlClientProvider messages={await clientMessages("auth")}>{children}</NextIntlClientProvider>
      </main>
    </div>
  );
}
