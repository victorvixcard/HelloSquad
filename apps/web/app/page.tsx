import { Agent, Button, SQUAD } from "@hellosquad/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { siteUrl } from "@/lib/env";
import { OPEN_GRAPH_BASE, RESPONSIBILITIES, SITE } from "@/lib/site";
import "./home.css";

export const metadata: Metadata = {
  alternates: { canonical: "/", languages: { "pt-BR": "/" } },
  openGraph: { ...OPEN_GRAPH_BASE, url: "/" },
};

function jsonLd() {
  const url = siteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}/#organizacao`,
        name: "HelloSquad",
        url: `${url}/`,
        description: SITE.description,
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${url}/#aplicativo`,
        name: "HelloSquad",
        url: `${url}/`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "pt-BR",
        description: SITE.definition,
        publisher: { "@id": `${url}/#organizacao` },
        featureList: SQUAD.map((m) => `${m.name}, ${m.area}: ${RESPONSIBILITIES[m.id]}`),
      },
    ],
  };
}

export default function Home() {
  return (
    <div className="hm">
      <a className="hs-skip" href="#conteudo">
        Pular para o conteúdo
      </a>
      <script
        type="application/ld+json"
        // JSON-LD estático, montado no servidor a partir de constantes do repositório.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()).replace(/</g, "\\u003c") }}
      />
      <header className="hm-head">
        <Link href="/" className="hs-wordmark hm-wm" aria-label="HelloSquad, página inicial">
          HelloSquad
        </Link>
        <nav aria-label="Conta">
          <Link className="hm-link" href="/entrar">
            Entrar
          </Link>
        </nav>
      </header>
      <main id="conteudo">
        <section className="hm-hero" aria-labelledby="hm-titulo">
          <h1 id="hm-titulo">
            Você cuida do seu negócio.
            <br />
            <span>Seu squad de IA assume o marketing.</span>
          </h1>
          <p className="hm-lead">{SITE.definition}</p>
          <Button href="/criar-conta" linkAs={Link}>
            Criar conta grátis
          </Button>
          <ul className="hm-row" aria-label="Os sete especialistas">
            {SQUAD.map((m) => (
              <li key={m.id}>
                <Agent agent={m.id} size={52} title={`${m.name}, ${m.area}`} />
              </li>
            ))}
          </ul>
        </section>
        <section className="hm-squad" aria-labelledby="hm-squad-titulo">
          <h2 id="hm-squad-titulo">
            Sete especialistas disponíveis
            <br />
            24 horas por dia, 7 dias por semana.
          </h2>
          <dl className="hm-list">
            {SQUAD.map((m) => (
              <div key={m.id} className="hm-item">
                <dt>
                  <Agent agent={m.id} size="padrao" />
                  <span>
                    <b>{m.name}</b> · {m.area}
                  </span>
                </dt>
                <dd>{RESPONSIBILITIES[m.id]}</dd>
              </div>
            ))}
          </dl>
          <p className="hm-note">Você toma as decisões. Eles fazem o trabalho.</p>
        </section>
      </main>
      <footer className="hm-foot">
        <span className="hs-wordmark hm-foot-wm">HelloSquad</span>
        <nav aria-label="Rodapé">
          <Link href="/criar-conta">Criar conta grátis</Link>
          <Link href="/entrar">Entrar</Link>
        </nav>
        <span className="hm-foot-end">© 2026 HelloSquad</span>
      </footer>
    </div>
  );
}
