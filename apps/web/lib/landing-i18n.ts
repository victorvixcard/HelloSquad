import type { Locale } from "@/i18n/config";
import en from "@/content/landing/en.json";
import es from "@/content/landing/es.json";
import ptBR from "@/content/landing/pt-BR.json";

// A copy da Landing R32 é a do protótipo, em pt-BR, dentro do template e da classe Component gerados por script.
// en e es: dicionário pt-BR → idioma aplicado na interpolação (texto do template, textos da classe e rótulos dos
// componentes do DS). en.json/es.json traduzem por índice da lista content/landing/pt-BR.json (scripts/landing-strings.mjs);
// chave não numérica traduz a própria string. O que faltar sai em pt-BR (lista em docs/parciais/L1-relatorio.md).
type IndexedTranslations = Record<string, string>;

function build(map: IndexedTranslations): Record<string, string> {
  const dict: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) {
    if (!v) continue;
    const source = /^\d+$/.test(k) ? ptBR[Number(k)] : k;
    if (source !== undefined) dict[source] = v;
  }
  return dict;
}

const DICTIONARIES: Partial<Record<Locale, Record<string, string>>> = { en: build(en), es: build(es) };

export function landingDictionary(locale: Locale): Record<string, string> | undefined {
  return DICTIONARIES[locale];
}

/** Para o teste e o relatório: quantas strings da lista pt-BR ficaram sem tradução num idioma. */
export function untranslated(locale: "en" | "es"): string[] {
  const dict = DICTIONARIES[locale] ?? {};
  return ptBR.filter((s) => !(s in dict));
}
