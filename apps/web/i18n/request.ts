import { getRequestConfig } from "next-intl/server";
import { loadMessages } from "./catalogs";
import { DEFAULT_LOCALE, isLocale, TIME_ZONE } from "./config";

// O idioma chega pelo cabeçalho que o middleware grava (i18n/resolve.ts): na área logada e nas telas de entrar,
// pela ordem pessoa → negócio → pt-BR; em /en e /es, pela rota. A página / é estática (force-static): sem
// cabeçalho, fica em pt-BR.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;
  return { locale, timeZone: TIME_ZONE, messages: await loadMessages(locale) };
});
