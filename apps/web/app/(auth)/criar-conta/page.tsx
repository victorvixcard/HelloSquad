import { Agent } from "@hellosquad/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = {
  title: "Criar conta grátis",
  description:
    "Crie sua conta na HelloSquad: sete especialistas de marketing com IA que trabalham juntos para o seu negócio.",
  alternates: { canonical: "/criar-conta" },
};

export default function CriarContaPage() {
  return (
    <section className="hs-sheet" aria-labelledby="criar-titulo">
      <Agent agent="nexo" size={40} expression="big" />
      <h1 id="criar-titulo">Crie sua conta grátis.</h1>
      <p>Diga o que você precisa e o squad começa por aí.</p>
      <SignupForm />
      <p className="hs-sheet-sub">
        Já tem conta?{" "}
        <Link className="hs-link" href="/entrar">
          Entrar
        </Link>
      </p>
    </section>
  );
}
