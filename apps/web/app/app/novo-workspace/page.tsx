import { Agent } from "@hellosquad/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { ApiUnavailable } from "@/components/ApiUnavailable";
import { loadMe } from "@/lib/api";
import { NewWorkspaceForm } from "./NewWorkspaceForm";

export const metadata: Metadata = { title: "Adicionar um negócio" };

export default async function NovoWorkspacePage() {
  const result = await loadMe();
  if (!result.ok) return <ApiUnavailable error={result.error} retryHref="/app/novo-workspace" />;
  const { me } = result;
  const first = me.memberships[0];
  return (
    <div className="flex min-h-dvh flex-col bg-papel">
      <a className="hs-skip" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="flex h-16 items-center justify-between gap-4 px-5 sm:px-8">
        <span className="hs-wordmark text-[22px]">HelloSquad</span>
        <p className="m-0 text-sm text-tinta-suave">
          {me.user.email ? <span className="hidden sm:inline">{me.user.email} · </span> : null}
          <Link className="hs-link" href="/sair">
            Sair
          </Link>
        </p>
      </header>
      <main id="conteudo" className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        <section className="hs-sheet" aria-labelledby="novo-titulo">
          <Agent agent="nexo" size={40} expression="happy" />
          <h1 id="novo-titulo">{first ? "Adicionar um negócio." : "Comece pelo seu negócio."}</h1>
          <p>O squad trabalha para uma marca de cada vez. Diga o nome e escolha o endereço.</p>
          <NewWorkspaceForm />
          {first ? (
            <p className="hs-sheet-sub">
              <Link className="hs-link" href={`/app/${first.workspace.slug}`}>
                Voltar para {first.workspace.name}
              </Link>
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
