import Link from "next/link";

// Dentro da casca (por exemplo /app/miolo/squad/fulano).
export default function WorkspacePageNotFound() {
  return (
    <header className="pg-head">
      <p className="hs-label">Endereço não encontrado</p>
      <h1>Essa página não existe.</h1>
      <p className="pg-desc">
        Confira o endereço ou volte para o{" "}
        <Link className="hs-link" href="/app">
          início do seu squad
        </Link>
        .
      </p>
    </header>
  );
}
