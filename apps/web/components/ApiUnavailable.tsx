import type { ApiError } from "@hellosquad/contracts";
import { Agent } from "@hellosquad/ui";
import Link from "next/link";

/** Estado honesto quando a API não responde: diz o que aconteceu e como tentar de novo. */
export function ApiUnavailable({ error, retryHref }: { error: ApiError; retryHref: string }) {
  return (
    <main id="conteudo" className="flex min-h-dvh items-center justify-center bg-papel px-4">
      <section className="hs-sheet" aria-labelledby="erro-titulo">
        <Agent agent="nexo" size={40} expression="serio" />
        <h1 id="erro-titulo">Não deu para carregar o seu squad agora.</h1>
        <p>{error.message}</p>
        <p className="hs-sheet-sub">
          <Link className="hs-link" href={retryHref}>
            Tentar de novo
          </Link>
        </p>
      </section>
    </main>
  );
}
