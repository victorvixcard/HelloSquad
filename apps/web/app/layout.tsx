import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HelloSquad",
  description:
    "Equipe de marketing com IA para pequenos e médios negócios: sete especialistas que conhecem a sua marca.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
