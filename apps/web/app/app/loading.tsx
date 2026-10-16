import { getTranslations } from "next-intl/server";

/**
 * Entrada na área logada (H2-22): enquanto o servidor busca o negócio na API, um aviso no idioma da tela. Fica neste
 * nível (e não na raiz) para não entrar no HTML do site público nem piscar entre as telas de um mesmo negócio.
 */
export default async function AppLoading() {
  const t = await getTranslations("system");
  return (
    <main id="conteudo" className="flex min-h-dvh items-center justify-center bg-papel px-4">
      <p role="status" className="hs-sheet-sub">
        {t("loading")}
      </p>
    </main>
  );
}
