"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

/**
 * Erro de execução numa tela do negócio (H2-22): dentro da casca, como o 404 do negócio, no idioma da tela.
 * "Tentar de novo" recarrega os dados do servidor e redesenha a tela.
 */
export default function WorkspacePageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("system.error");
  const router = useRouter();
  const { workspace } = useParams<{ workspace: string }>();
  const [pending, startTransition] = useTransition();
  return (
    <header className="pg-head">
      <h1>{t("title")}</h1>
      <p className="pg-desc">
        {t.rich("lead", {
          home: (chunks) => (
            <Link className="hs-link" href={`/app/${workspace}`}>
              {chunks}
            </Link>
          ),
        })}
      </p>
      <p className="pg-desc">
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
    </header>
  );
}
