import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
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
  return (
    <html lang={locale} className={`${gabarito.variable} ${jetbrainsMono.variable}`}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
