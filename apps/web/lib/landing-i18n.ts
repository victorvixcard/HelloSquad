import type { Locale } from "@/i18n/config";
import en from "@/content/landing/en.json";
import es from "@/content/landing/es.json";

// A copy da Landing R32 é a do protótipo, em pt-BR, dentro do template e da classe Component gerados por script.
// en e es: dicionário pt-BR → idioma aplicado na interpolação (texto do template, textos da classe e rótulos dos
// componentes do DS). O que não estiver no dicionário sai em pt-BR (lista em docs/parciais/L1-relatorio.md).
const DICTIONARIES: Partial<Record<Locale, Record<string, string>>> = { en, es };

export function landingDictionary(locale: Locale): Record<string, string> | undefined {
  return DICTIONARIES[locale];
}
