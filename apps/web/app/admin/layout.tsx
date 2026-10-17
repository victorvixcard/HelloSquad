import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { clientMessages } from "@/i18n/client-messages";
import "@hellosquad/ui/ds-bundle.css";
import "@hellosquad/ui/super-admin.css";
import "./admin.css";

// O painel nunca entra em buscador (o next.config também manda X-Robots-Tag em /admin/* e o robots.txt o bloqueia).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.meta");
  return {
    title: { default: `${t("title")} · HelloSquad`, template: t("titleTemplate") },
    robots: { index: false, follow: false, nocache: true },
  };
}

// Toda página do matcher do middleware é dinâmica: o nonce da CSP chega por requisição.
export const dynamic = "force-dynamic";

// O painel leva ao browser só o catálogo dele (e o do sistema), não o do produto nem o do site.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return <NextIntlClientProvider messages={await clientMessages("admin")}>{children}</NextIntlClientProvider>;
}
