import type { Locale } from "./i18n/config";
import type { Messages } from "./messages/pt-BR";

// Chaves do catálogo tipadas: t("chave") inexistente não compila.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
