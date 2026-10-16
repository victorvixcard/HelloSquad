import { DEFAULT_LOCALE, type Locale } from "./config";
import type { Messages } from "@/messages/pt-BR";

type Loader = () => Promise<{ default: Messages }>;

/**
 * Catálogo de cada idioma (ADR-0010), carregado só quando a tela usa: en e es têm os mesmos namespaces e chaves do
 * pt-BR (o tipo Messages acusa chave faltando; `test/catalog-parity.test.ts` confere chaves, argumentos e formato).
 */
const CATALOGS: Record<Locale, Loader> = {
  "pt-BR": () => import("@/messages/pt-BR"),
  en: () => import("@/messages/en"),
  es: () => import("@/messages/es"),
};

export async function loadMessages(locale: Locale): Promise<Messages> {
  const load = CATALOGS[locale] ?? CATALOGS[DEFAULT_LOCALE];
  return (await load()).default;
}
