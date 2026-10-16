"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { publicLocaleOf, PUBLIC_LOCALE_PATHS } from "@/i18n/resolve";
import { isAppPath } from "@/lib/supabase/session-cookie";

/**
 * Erro de execução abaixo do layout raiz (H2-22): no idioma da tela, com a mesma folha do 404, em vez da página
 * padrão do Next em inglês. "Tentar de novo" recarrega os dados do servidor e redesenha o trecho que falhou.
 */
export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("system.error");
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [pending, startTransition] = useTransition();
  const home = isAppPath(pathname) ? "/app" : PUBLIC_LOCALE_PATHS[publicLocaleOf(pathname) ?? DEFAULT_LOCALE];
  return (
    <main id="conteudo" className="flex min-h-dvh items-center justify-center bg-papel px-4">
      <section className="hs-sheet" aria-labelledby="erro-titulo">
        <h1 id="erro-titulo">{t("title")}</h1>
        <p>
          {t.rich("lead", {
            home: (chunks) => (
              <Link className="hs-link" href={home}>
                {chunks}
              </Link>
            ),
          })}
        </p>
        <p className="hs-sheet-sub">
          <button
            type="button"
            className="hs-link"
            disabled={pending}
            onClick={() =>
              startTransition(() => {
                router.refresh();
                reset();
              })
            }
          >
            {t("retry")}
          </button>
        </p>
      </section>
    </main>
  );
}
