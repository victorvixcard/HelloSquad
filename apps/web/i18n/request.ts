import { getRequestConfig } from "next-intl/server";
import { loadMessages } from "./catalogs";
import { DEFAULT_LOCALE, TIME_ZONE } from "./config";

// Sem rota por idioma por enquanto: tudo em pt-BR (ADR-0010). Quando en e es chegarem,
// o idioma vem do segmento da rota (/en, /es) e, na área logada, do workspace e da pessoa.
export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;
  return { locale, timeZone: TIME_ZONE, messages: await loadMessages(locale) };
});
