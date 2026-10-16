import type { Metadata } from "next";

// Toda a área logada fica fora dos buscadores (o next.config também manda X-Robots-Tag).
export const metadata: Metadata = {
  title: { default: "Seu squad", template: "%s · HelloSquad" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
