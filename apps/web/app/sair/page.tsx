import { Button } from "@hellosquad/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/lib/auth-actions";

export const metadata: Metadata = {
  title: "Sair",
  robots: { index: false, follow: false },
};

// Dinâmica: o middleware manda o nonce da CSP a cada requisição (lib/security-headers.ts).
export const dynamic = "force-dynamic";

// Sair é sempre um POST (formulário): um link ou prefetch nunca encerra a sessão por engano.
export default function SairPage() {
  return (
    <main id="conteudo" className="flex min-h-dvh items-center justify-center bg-papel px-4">
      <section className="hs-sheet" aria-labelledby="sair-titulo">
        <h1 id="sair-titulo">Sair da sua conta?</h1>
        <p>Você entra de novo quando quiser, com o mesmo e-mail.</p>
        <form action={signOut} className="flex flex-wrap items-center gap-3">
          <Button type="submit">Sair</Button>
          <Link className="hs-link" href="/app">
            Voltar
          </Link>
        </form>
      </section>
    </main>
  );
}
