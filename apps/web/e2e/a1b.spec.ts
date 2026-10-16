import { expect, test, type Page } from "@playwright/test";
import { signIn, snap } from "./helpers";

// A1b: Projetos (Quadro com o trabalho do seed), Memória da Marca (dossiê da Miolo) e "<Agente> percebeu"
// confirmado pela Marina, com a outra aba recebendo a decisão ao vivo (Realtime `memory_suggestion.decided`).
// Roda antes dos outros arquivos (ordem alfabética, um worker): o seed está intacto; o teardown reaplica o seed.

const SEED_WORK = "Legenda do post de sábado: pão de fermentação longa";
const SEED_SUGGESTION = "Posts com bastidores do forno têm mais salvamentos";

async function enterAsMarina(page: Page, path: string) {
  await page.goto(`/entrar?next=${encodeURIComponent(path)}`);
  await signIn(page, "marina@miolo.example");
  await page.waitForURL((url) => url.pathname === path, { timeout: 30_000 });
}

test.describe("Projetos e Memória da Marca (A1b)", () => {
  test("o Quadro de Projetos mostra o trabalho do seed na coluna Precisa de você", async ({ page }) => {
    await enterAsMarina(page, "/app/miolo/squad/nexo");
    await expect(page.getByRole("heading", { level: 1, name: "Projetos" })).toBeVisible();
    // Roadmap sem projeto no seed: o vazio da V4.6.
    await expect(page.getByText("Nenhum projeto ainda")).toBeVisible();
    const you = page.getByRole("region", { name: /^Precisa de você, \d+ trabalho/ });
    await expect(you).toBeVisible();
    await expect(you.getByText(SEED_WORK)).toBeVisible();
    for (const col of ["Em andamento", "Programados", "Concluídos"]) {
      await expect(page.getByRole("region", { name: new RegExp(`^${col}, \\d+ trabalho`) }).getByText(SEED_WORK)).toHaveCount(0);
    }
    await snap(page, "a1b-quadro");
  });

  test("dossiê da Miolo: o que o squad sabe, de onde vem, principais conhecimentos e o que espera o seu ok", async ({ page }) => {
    await enterAsMarina(page, "/app/miolo/memoria-da-marca");
    await expect(page.getByRole("heading", { level: 1, name: "Memória da Marca" })).toBeVisible();
    const dossier = page.locator("section.me-dos");
    await expect(dossier.locator("#me-dos-t")).toHaveText("Miolo");
    await expect(dossier.getByRole("button", { name: "Público: Moradores de Pinheiros e Vila Madalena, 28 a 45 anos. Abrir" })).toBeVisible();
    await expect(dossier.getByRole("button", { name: "Produtos: Pão de fermentação longa. Abrir" })).toBeVisible();
    await expect(dossier.getByRole("button", { name: "Tom de comunicação: Acolhedor, direto, sem gíria. Abrir" })).toBeVisible();
    await expect(dossier.getByRole("button", { name: "Onboarding e o que você contou: Declarado por você. Ver as fontes" })).toBeVisible();
    await expect(dossier.getByRole("button", { name: "Instagram: Não conectada. Ver as fontes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Squad · Para você confirmar: 1 sugestão. Revisar" })).toBeVisible();
    // A decisão do seed (não usar 'artesanal') está em uso e no histórico.
    await expect(
      page.getByRole("button", { name: "Palavra proibida: Não usar a palavra 'artesanal' nas legendas. Decisão sua. Ver detalhes" }),
    ).toBeVisible();
    await expect(page.locator(".me-log")).toContainText("Você decidiu: não usar a palavra 'artesanal' nas legendas");
    await snap(page, "a1b-memoria-dossie");
  });

  test("Marina confirma o que o Otto percebeu, o conhecimento aparece e a outra aba recebe ao vivo", async ({ page, context }) => {
    await enterAsMarina(page, "/app/miolo/memoria-da-marca");
    // Outra aba da mesma sessão, aberta antes da decisão: tem de mudar sem recarregar.
    const watcher = await context.newPage();
    await watcher.goto("/app/miolo/memoria-da-marca");
    const watchedCard = watcher.locator(".me-pend .ml-s.is-hypo", { hasText: "Otto percebeu · descobertas" });
    await expect(watchedCard).toBeVisible();
    await watcher.evaluate(() => {
      (window as unknown as { __a1b: number }).__a1b = 1;
    });
    await watcher.waitForTimeout(1500); // o canal do Realtime entra no ar

    const card = page.locator(".me-pend .ml-s.is-hypo", { hasText: "Otto percebeu · descobertas" });
    await expect(card.getByText(`${SEED_SUGGESTION}?`)).toBeVisible();
    await expect(card.getByText("Nada muda nas entregas até você confirmar.")).toBeVisible();
    await card.getByRole("button", { name: "Confirmar" }).click();

    await expect(page.getByRole("status").filter({ hasText: "Confirmado. Todo o squad passa a usar." })).toBeVisible();
    await expect(card).toHaveCount(0);
    await expect(page.getByText("Tudo revisado. Quando o squad perceber algo novo, aparece aqui para você confirmar, corrigir ou descartar.")).toBeVisible();
    const fact = page.getByRole("button", { name: `Bastidores: ${SEED_SUGGESTION}. Confirmado. Ver detalhes` });
    await expect(fact).toBeVisible();
    await expect(page.locator(".me-log")).toContainText("Você confirmou: posts com bastidores do forno têm mais salvamentos");
    await expect(page.getByRole("button", { name: /Squad · Para você confirmar/ })).toHaveCount(0);
    await snap(page, "a1b-memoria-confirmado");

    // A outra aba: a sugestão sai de "O squad percebeu" e o conhecimento entra, sem recarregar a página.
    await expect(watchedCard).toHaveCount(0, { timeout: 20_000 });
    await expect(watcher.getByRole("button", { name: `Bastidores: ${SEED_SUGGESTION}. Confirmado. Ver detalhes` })).toBeVisible();
    expect(await watcher.evaluate(() => (window as unknown as { __a1b?: number }).__a1b)).toBe(1);

    // Persistido: recarregando, continua confirmado e a linha aberta diz quem usa e desde quando.
    await page.reload();
    await fact.click();
    const row = page.locator(".me-br .me-r.is-open");
    await expect(row).toContainText("Confirmado por você");
    await expect(row).toContainText("Como o squad utiliza");
    await watcher.close();
  });
});
