import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-papel">
      <a className="hs-skip" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="flex h-16 items-center px-5 sm:px-8">
        <Link href="/" className="hs-wordmark text-[22px]" aria-label="HelloSquad, página inicial">
          HelloSquad
        </Link>
      </header>
      <main id="conteudo" className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        {children}
      </main>
    </div>
  );
}
