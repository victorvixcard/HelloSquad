import { DEFAULT_LOCALE, type Locale } from "./config";
import type { Messages } from "@/messages/pt-BR";

type Loader = () => Promise<{ default: Messages }>;

/**
 * Catálogos já traduzidos. en e es entram aqui quando a tradução chegar (cada um com os mesmos
 * namespaces e chaves de pt-BR; o tipo Messages acusa chave faltando). Até lá, caem no padrão.
 */
const CATALOGS: Partial<Record<Locale, Loader>> = {
  "pt-BR": () => import("@/messages/pt-BR"),
};

export async function loadMessages(locale: Locale): Promise<Messages> {
  const load = CATALOGS[locale] ?? CATALOGS[DEFAULT_LOCALE]!;
  return (await load()).default;
}
