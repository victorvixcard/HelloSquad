import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.room");
  return { title: t("title") };
}

/** A Sala do Squad é a conversa com todo o squad, em tela cheia: a casca abre o painel dedicado nesta rota. */
export default function SalaDoSquadPage() {
  return null;
}
