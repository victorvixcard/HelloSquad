import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { clientMessages } from "@/i18n/client-messages";

// Toda a área logada fica fora dos buscadores (o next.config também manda X-Robots-Tag).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("system");
  return {
    title: { default: t("appTitle"), template: "%s · HelloSquad" },
    robots: { index: false, follow: false, nocache: true },
  };
}

// A área logada leva ao browser o catálogo dela (tudo menos o texto do site público, H2-08).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return <NextIntlClientProvider messages={await clientMessages("app")}>{children}</NextIntlClientProvider>;
}
