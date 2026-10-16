import { Agent } from "@hellosquad/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entre na HelloSquad para ver o que o seu squad fez desde a última vez.",
  alternates: { canonical: "/entrar" },
  robots: { index: false, follow: true },
};

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; sessao?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next) ?? undefined;
  return (
    <section className="hs-sheet" aria-labelledby="entrar-titulo">
      <Agent agent="nexo" size={40} expression="big" />
      <h1 id="entrar-titulo">Bem-vindo de volta.</h1>
      <p>Entre para ver o que o seu squad fez desde a última vez.</p>
      {params.sessao === "expirada" ? (
        <p className="hs-form-err" role="status">
          Sua sessão expirou. Entre de novo para continuar.
        </p>
      ) : null}
      <LoginForm next={next} />
      <p className="hs-sheet-sub">
        Ainda não tem conta?{" "}
        <Link className="hs-link" href="/criar-conta">
          Criar conta grátis
        </Link>
      </p>
    </section>
  );
}
