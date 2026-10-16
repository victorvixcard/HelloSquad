import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { siteUrl } from "@/lib/env";
import { OPEN_GRAPH_BASE, SITE } from "@/lib/site";
import { gabarito, jetbrainsMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: SITE.title, template: "%s · HelloSquad" },
  description: SITE.description,
  applicationName: "HelloSquad",
  openGraph: OPEN_GRAPH_BASE,
  twitter: { card: "summary", title: SITE.title, description: SITE.description },
  formatDetection: { telephone: false, email: false, address: false },
};

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
