"use client";

import { createTranslator } from "next-intl";
import { useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";
import { publicLocaleOf, PUBLIC_LOCALE_PATHS } from "@/i18n/resolve";
import { isAppPath } from "@/lib/supabase/session-cookie";
import en from "@/messages/en/system.json";
import es from "@/messages/es/system.json";
import ptBR from "@/messages/pt-BR/system.json";
import { gabarito, jetbrainsMono } from "./fonts";
import "./globals.css";

/** Só o catálogo de sistema dos três idiomas: esta página substitui o layout raiz e fica sem o provider do next-intl. */
const SYSTEM: Record<Locale, typeof ptBR> = { "pt-BR": ptBR, en, es };

const noop = () => () => {};
/** Idioma da tela que falhou: o `lang` que o layout raiz pôs no documento; no servidor, pt-BR. */
const documentLocale = (): Locale => {
  const lang = document.documentElement.lang;
  return isLocale(lang) ? lang : DEFAULT_LOCALE;
};
const documentPath = () => window.location.pathname;

/**
 * Erro no próprio layout raiz (H2-22): troca o documento inteiro, então resolve o idioma sozinho (o `lang` em uso) e
 * desenha a mesma folha do 404, em vez da página padrão do Next em inglês.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useSyncExternalStore(noop, documentLocale, () => DEFAULT_LOCALE);
  const pathname = useSyncExternalStore(noop, documentPath, () => "/");
  const t = createTranslator({ locale, messages: { system: SYSTEM[locale] }, namespace: "system.error" });
  const home = isAppPath(pathname) ? "/app" : PUBLIC_LOCALE_PATHS[publicLocaleOf(pathname) ?? locale];
  return (
    <html lang={locale} className={`${gabarito.variable} ${jetbrainsMono.variable}`}>
      <body>
        <main id="conteudo" className="flex min-h-dvh items-center justify-center bg-papel px-4">
          <section className="hs-sheet" aria-labelledby="erro-titulo">
            <h1 id="erro-titulo">{t("title")}</h1>
            <p>
              {t.rich("lead", {
                // Fora do roteador do Next: link comum, que recarrega a página inteira.
                home: (chunks) => (
                  <a className="hs-link" href={home}>
                    {chunks}
                  </a>
                ),
              })}
            </p>
            <p className="hs-sheet-sub">
              <button type="button" className="hs-link" onClick={() => reset()}>
                {t("retry")}
              </button>
            </p>
          </section>
        </main>
      </body>
    </html>
  );
}
