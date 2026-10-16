import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

const REQUEST = "Quero uma legenda para o Instagram: levar clientes à loja no sábado de manhã.";
const TITLE = "Quero uma legenda para o Instagram: levar clientes à loja no sábado de manhã";

/**
 * Canal do Realtime com o compasso nas mãos do teste: o worker simulado termina o run em menos de um segundo, rápido
 * demais para ver "escrevendo…". Os eventos reais passam na hora até o Otto começar a escrever (`agent.thinking` da
 * etapa `otto.produce`); dali em diante os eventos do squad ficam guardados até `release()`, e saem na mesma ordem.
 * O resto do protocolo (entrada no canal, batimentos) passa sempre. Nada é inventado: só o tempo de entrega muda.
 */
async function pacedRealtime(page: Page) {
  let armed = true;
  let holding = false;
  const held: Array<() => void> = [];
  await page.routeWebSocket(/\/realtime\/v1\/websocket/, (ws) => {
    const server = ws.connectToServer();
    ws.onMessage((message) => server.send(message));
    server.onMessage((message) => {
      const text = typeof message === "string" ? message : message.toString("utf8");
      const deliver = () => ws.send(message);
      if (holding && /run_event|approval\./.test(text)) {
        held.push(deliver);
        return;
      }
      deliver();
      if (armed && text.includes('"agent.thinking"') && text.includes('"otto.produce"')) {
        armed = false;
        holding = true;
      }
    });
  });
  return {
    /** Solta os eventos guardados, na ordem em que chegaram. */
    release() {
      holding = false;
      for (const deliver of held.splice(0)) deliver();
    },
    /** Volta a segurar no próximo "Otto começou a escrever" (o run do ajuste). */
    arm() {
      armed = true;
    },
  };
}

async function openOttoConversation(page: Page) {
  await page.goto("/entrar");
  await signIn(page, "marina@miolo.example");
  await expect(page).toHaveURL(/\/app\/miolo$/);
  // H0-03 (decisão da A1a): cookie da sessão httpOnly; o Realtime recebe só o token de acesso, pelo servidor.
  const session = (await page.context().cookies()).filter((c) => /^sb-.+-auth-token/.test(c.name));
  expect(session.length).toBeGreaterThan(0);
  expect(session.every((c) => c.httpOnly)).toBe(true);
  expect(await page.evaluate(() => document.cookie)).not.toContain("auth-token");
  const nav = page.getByRole("navigation", { name: "HelloSquad" });
  await nav.getByRole("link", { name: "Conteúdo, com Otto" }).click();
  await expect(page).toHaveURL(/\/app\/miolo\/squad\/otto$/);
  return nav;
}

test.describe("Ao vivo (A1a), com o worker do squad em modo simulado", () => {
  test("Marina pede uma legenda, vê o Otto escrevendo, recebe a v1 sem recarregar, revisa e aprova", async ({ page }) => {
    test.setTimeout(120_000);
    const channel = await pacedRealtime(page);
    const nav = await openOttoConversation(page);
    // Seed: uma revisão pendente do Otto (a legenda 04.01).
    await expect(page.getByRole("region", { name: "Precisa de você: 1" })).toBeVisible();

    // Marca na janela: se a página recarregar, a marca some.
    await page.evaluate(() => ((window as unknown as { __a1a: number }).__a1a = 1));

    await page.locator("button.v4-talk").click();
    const panel = page.getByRole("region", { name: "Conversa" });
    const field = panel.getByRole("textbox", { name: "Mensagem para o Otto…" });
    await expect(field).toBeVisible();
    await field.fill(REQUEST);
    await field.press("Enter");

    // A mensagem da pessoa aparece na hora; o pedido vira trabalho e o squad começa (Nexo organiza, Otto escreve).
    await expect(panel.locator(".ps-msg-u .ps-bub").filter({ hasText: REQUEST })).toBeVisible();
    await expect(panel.locator(".ps-cstat")).toContainText("Otto");
    await expect(panel.locator(".ps-cstat")).toContainText("criando a primeira versão");
    await expect(panel.locator(".ps-cvh-st")).toHaveText("escrevendo…");
    await expect(panel.getByText("Otto está escrevendo")).toBeVisible();

    // O resto do run chega: a mensagem do Otto com o cartão da v1, o "digitando" some, a faixa ganha a pendência.
    channel.release();
    const card = panel.locator(".ps-mat");
    await expect(card.getByText("Material · v1")).toBeVisible({ timeout: 20_000 });
    await expect(card.getByText(TITLE)).toBeVisible();
    await expect(card.getByText("Aguarda sua aprovação")).toBeVisible();
    await expect(panel.getByText("Otto está escrevendo")).toHaveCount(0);
    // O status vivo da conversa passa de trabalho a espera: "Otto · aguarda sua aprovação" (V4.6, modo `wait`).
    await expect(panel.locator(".ps-cstat")).toContainText("aguarda sua aprovação");
    await expect(panel.locator(".ps-cvh-st")).toHaveText("aguarda sua aprovação");
    await expect(page.getByRole("region", { name: "Precisa de você: 2" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Projetos, com Nexo, 2 aguardam você" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ver mais 1 pendência" })).toBeVisible();

    // Revisar: o cartão abre o trabalho com a legenda; aprovar chama a API da S1b (só o owner decide).
    await card.getByRole("button", { name: `Abrir a v1: ${TITLE}` }).click();
    await expect(page).toHaveURL(/\/app\/miolo\/squad\/otto\/trabalho\/[0-9a-f-]{36}$/);
    const work = page.getByRole("main");
    await expect(work.getByRole("heading", { name: TITLE })).toBeVisible();
    await work.getByRole("button", { name: "Aprovar v1" }).click();
    await expect(work.getByText("Aprovada por você").first()).toBeVisible();
    // A pendência sai da contagem da barra ao vivo (fica só a revisão do seed).
    await expect(nav.getByRole("link", { name: "Projetos, com Nexo, 1 aguarda você" })).toBeVisible();

    // O cartão na conversa acompanha a decisão.
    await expect(card.getByText("Aprovada por você")).toBeVisible();
    await expect(card.getByRole("button", { name: "Aprovar v1" })).toHaveCount(0);

    // Tudo isso sem recarregar a página.
    expect(await page.evaluate(() => (window as unknown as { __a1a?: number }).__a1a)).toBe(1);
  });
  test("Marina pede ajuste pela conversa, vê o Otto ajustando e aprova a v2 que chega ao vivo", async ({ page }) => {
    test.setTimeout(120_000);
    const request = "Quero um texto para o Instagram: convidar para o café da manhã de domingo.";
    const title = "Quero um texto para o Instagram: convidar para o café da manhã de domingo";
    const channel = await pacedRealtime(page);
    await openOttoConversation(page);
    await page.evaluate(() => ((window as unknown as { __a1a: number }).__a1a = 1));

    await page.locator("button.v4-talk").click();
    const panel = page.getByRole("region", { name: "Conversa" });
    const field = panel.getByRole("textbox", { name: "Mensagem para o Otto…" });
    await field.fill(request);
    await field.press("Enter");
    await expect(panel.getByText("Otto está escrevendo")).toBeVisible();
    channel.release();
    const v1 = panel.locator(".ps-mat").filter({ hasText: title }).filter({ hasText: "Material · v1" });
    await expect(v1.getByText("Aguarda sua aprovação")).toBeVisible({ timeout: 20_000 });

    // "Pedir ajuste" no cartão: o campo recebe o texto do protótipo; o envio registra o pedido com a nota.
    channel.arm();
    await v1.getByRole("button", { name: "Pedir ajuste" }).click();
    await expect(field).toHaveValue("Quero pedir um ajuste nesta versão.");
    await field.press("End");
    await field.pressSequentially(" Mais curto, por favor.");
    await field.press("Enter");
    await expect(panel.locator(".ps-msg-u .ps-bub").filter({ hasText: "Mais curto, por favor." })).toBeVisible();
    await expect(v1.getByText("Nova versão a caminho")).toBeVisible();
    await expect(panel.locator(".ps-cstat")).toContainText("ajustando a versão");
    await expect(panel.getByText("Otto está escrevendo")).toBeVisible();

    // A v2 chega: cartão novo aguardando a decisão; a v1 fica substituída. Aprovar pelo cartão.
    channel.release();
    const v2 = panel.locator(".ps-mat").filter({ hasText: title }).filter({ hasText: "Material · v2" });
    await expect(v2.getByText("Aguarda sua aprovação")).toBeVisible({ timeout: 20_000 });
    await expect(v1.getByText("Substituída pela v2")).toBeVisible();
    await expect(panel.getByText("Otto está escrevendo")).toHaveCount(0);
    await v2.getByRole("button", { name: "Aprovar v2" }).click();
    await expect(v2.getByText("Aprovada por você")).toBeVisible();

    expect(await page.evaluate(() => (window as unknown as { __a1a?: number }).__a1a)).toBe(1);
  });
});
