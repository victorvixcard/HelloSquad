import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Página não encontrada", robots: { index: false } };

export default function NotFound() {
  return (
    <main id="conteudo" className="flex min-h-dvh items-center justify-center bg-papel px-4">
      <section className="hs-sheet" aria-labelledby="nf-titulo">
        <h1 id="nf-titulo">Não encontramos esse endereço.</h1>
        <p>Ele não existe ou não faz parte dos seus negócios.</p>
        <p className="hs-sheet-sub">
          <Link className="hs-link" href="/app">
            Ir para o seu squad
          </Link>{" "}
          ou{" "}
          <Link className="hs-link" href="/">
            voltar ao início
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
