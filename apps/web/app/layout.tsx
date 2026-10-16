import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { clientMessages } from "@/i18n/client-messages";
import { siteUrl } from "@/lib/env";
import { openGraphBase } from "@/lib/site";
import { gabarito, jetbrainsMono } from "./fonts";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("site.meta");
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t("title"), template: "%s · HelloSquad" },
    description: t("description"),
    applicationName: "HelloSquad",
    openGraph: await openGraphBase(),
    twitter: { card: "summary", title: t("title"), description: t("description") },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#F7F7F5",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  // Só as áreas do catálogo que os componentes cliente desta parte usam (H2-08); entrar/criar conta e a área logada
  // abrem o próprio provider com as delas.
  return (
    <html lang={locale} className={`${gabarito.variable} ${jetbrainsMono.variable}`}>
      <body>
        <NextIntlClientProvider messages={await clientMessages("root")}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
