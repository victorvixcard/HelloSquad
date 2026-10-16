import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

// Toda a área logada fica fora dos buscadores (o next.config também manda X-Robots-Tag).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("system");
  return {
    title: { default: t("appTitle"), template: "%s · HelloSquad" },
    robots: { index: false, follow: false, nocache: true },
  };
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
