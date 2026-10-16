import { expect, test, type Locator, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { grantLocalCredits, signIn, snap } from "./helpers";

// A2d (H2-01): o critério da Fase 2 pela tela. A Marina pede a campanha na Sala do Squad (jornada 2 da V4.6, FLUXOS
// §3.2); o Nexo monta a equipe (cartão `team`) e o projeto coordenado 01.02 com uma etapa por especialista (S2d); a
// Bia entrega a estratégia e a Marina aprova; a Kaia fica aguardando o motor de imagem sem travar o Otto; o Otto
// entrega os textos com a estratégia aprovada no contexto; a Marina aprova e o projeto fecha com um responsável por
// etapa. O worker simulado do e2e roda as fixtures (`01.02`, `02.04`, `03.01` sem motor, `04.03` com a estratégia).

const REQUEST = "Quero uma campanha de Natal para vender mais panetones.";

/** Leitura no banco local (só o container `supabase_db_hellosquad`), para o que a tela não mostra: o contexto do run. */
function sql(query: string): string {
  return execFileSync("docker", ["exec", "supabase_db_hellosquad", "psql", "-U", "postgres", "-qtAc", query], { stdio: "pipe" })
    .toString()
    .trim();
}

async function enterAsMarina(page: Page, path: string) {
  await page.goto(`/entrar?next=${encodeURIComponent(path)}`);
  await signIn(page, "marina@miolo.example");
  await page.waitForURL((url) => url.pathname === path, { timeout: 30_000 });
}

/** A faixa de uma etapa: "Etapa N · título · responsável · estado". */
function stage(main: Locator, seq: number, title: string, name: string) {
  return main.getByRole("listitem", { name: new RegExp(`^Etapa ${seq} · ${title} · ${name} · `) });
}

test.describe("Projeto coordenado (A2d, H2-01), com o worker do squad em modo simulado", () => {
  test("Marina pede a campanha na Sala, aprova a Bia, a Kaia aguarda o motor, o Otto entrega com a estratégia e o projeto fecha", async ({ page }) => {
    test.setTimeout(180_000);
    grantLocalCredits("miolo", 30, "a2d-projeto");
    await enterAsMarina(page, "/app/miolo/sala-do-squad");

    // 1. O pedido de campanha na Sala do Squad vira o projeto coordenado (antes da A2d ficava só a mensagem).
    const panel = page.getByRole("region", { name: "Conversa" });
    const field = panel.getByRole("textbox").first();
    await expect(field).toBeVisible();
    await field.fill(REQUEST);
    await field.press("Enter");
    await expect(panel.locator(".ps-msg-u .ps-bub").filter({ hasText: REQUEST })).toBeVisible();

    // 2. O Nexo monta a equipe: cartão "Squad da campanha · o Nexo coordena", um especialista por etapa.
    const team = panel.locator(".ps-card").filter({ hasText: "Squad da campanha · o Nexo coordena" });
    await expect(team).toBeVisible({ timeout: 45_000 });
    for (const [name, role] of [
      ["Bia", "estratégia e conceito"],
      ["Kaia", "peças da campanha"],
      ["Otto", "legendas e roteiros"],
    ]) {
      await expect(team.locator(".ps-team-r").filter({ hasText: name })).toContainText(role);
    }
    // A Bia entrega a v1 da etapa 1 na mesma conversa (o material diz a etapa).
    await expect(panel.locator(".ps-mat").filter({ hasText: "Etapa 1 · Estratégia" })).toBeVisible({ timeout: 45_000 });
    await snap(page, "a2d-sala-campanha");

    // 3. "Abrir o projeto": o trabalho coordenado, com as etapas e o responsável de cada uma.
    await team.getByRole("button", { name: "Abrir o projeto" }).click();
    await expect(page).toHaveURL(/\/app\/miolo\/squad\/nexo\/trabalho\/[0-9a-f-]{36}$/);
    const workId = new URL(page.url()).pathname.split("/").pop() as string;
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1, name: "Campanha de Natal" })).toBeVisible();
    await expect(main.locator(".ps-meta .hs-tag")).toHaveText("projeto coordenado");
    await expect(main.getByText("Vender mais panetones no Natal.")).toBeVisible();
    await expect(stage(main, 1, "Estratégia", "Bia")).toHaveAccessibleName(/v1 aguarda você$/);
    await expect(stage(main, 2, "Peças", "Kaia")).toBeVisible();
    await expect(stage(main, 3, "Textos", "Otto")).toBeVisible();
    // "Precisa de você" só na etapa que depende da pessoa: um botão de aprovar, o da Bia.
    const approveButtons = main.getByRole("button", { name: /^Aprovar v\d$/ });
    await expect(approveButtons).toHaveCount(1);
    await expect(main.locator('.ps-ent[data-step="1"]').getByRole("button", { name: "Aprovar v1" })).toBeVisible();
    await expect(main.locator(".ps-nextd")).toContainText("Aprovar a etapa Estratégia");
    await snap(page, "a2d-projeto-estrategia");

    // 4. A Marina aprova a estratégia: a Kaia fica aguardando o motor (sem cobrar) e o Otto começa, sem travar.
    await main.locator('.ps-ent[data-step="1"]').getByRole("button", { name: "Aprovar v1" }).click();
    await expect(stage(main, 1, "Estratégia", "Bia")).toHaveAccessibleName(/v1 aprovada$/, { timeout: 30_000 });
    await expect(stage(main, 2, "Peças", "Kaia")).toHaveAccessibleName(/Aguardando o motor de imagem$/, { timeout: 45_000 });
    await expect(main.locator('.ps-ent[data-step="2"]')).toContainText("Nada é gerado nem cobrado até o motor chegar");
    await expect(main.locator('.ps-ent[data-step="2"]').getByRole("button")).toHaveCount(0);
    await expect(stage(main, 3, "Textos", "Otto")).toHaveAccessibleName(/v1 aguarda você$/, { timeout: 45_000 });
    await snap(page, "a2d-projeto-textos");

    // O Otto escreveu com a estratégia aprovada da Bia no contexto (handoff da etapa 1, `run_context_items`).
    const handoff = sql(
      `select count(*) from public.run_context_items c join public.runs r on r.id = c.run_id ` +
        `join public.work_item_steps s on s.id = r.step_id ` +
        `where r.work_item_id = '${workId}' and r.agent_id = 'otto' and c.kind = 'step' and s.seq = 3`,
    );
    expect(Number(handoff)).toBeGreaterThan(0);

    // 5. A Marina aprova os textos do Otto: o projeto fecha com um responsável por etapa.
    await main.locator('.ps-ent[data-step="3"]').getByRole("button", { name: "Aprovar v1" }).click();
    await expect(stage(main, 3, "Textos", "Otto")).toHaveAccessibleName(/v1 aprovada$/, { timeout: 30_000 });
    await expect(main.getByRole("button", { name: /^Aprovar v\d$/ })).toHaveCount(0);
    await expect(main.locator(".ps-nextd")).toContainText("Nenhuma decisão pendente");
    await main.getByRole("tab", { name: "Decisões" }).click();
    await expect(main.locator(".ps-dl.is-ok")).toHaveCount(2);
    await expect(main.locator(".ps-dl.is-ok").first()).toContainText("Estratégia aprovada");
    await main.getByRole("tab", { name: "Squad" }).click();
    for (const [name, role] of [
      ["Nexo", "coordena e acompanha"],
      ["Bia", "estratégia e conceito"],
      ["Kaia", "peças da campanha"],
      ["Otto", "legendas e roteiros"],
    ]) {
      await expect(main.locator(".ps-lr").filter({ hasText: name })).toContainText(role);
    }
    await snap(page, "a2d-projeto-fechado");
    expect(sql(`select status from public.work_items where id = '${workId}'`)).toBe("done");
    expect(sql(`select p.status from public.projects p join public.work_items w on w.project_id = p.id where w.id = '${workId}'`)).toBe("done");

    // 6. Em Projetos, o trabalho é um projeto (não uma entrega pontual), nos concluídos.
    await page.goto("/app/miolo/squad/nexo");
    const card = page.locator(`article.wk-card[data-work="${workId}"]`);
    await expect(card).toBeVisible();
    await expect(card.locator(".wk-k")).toHaveText("Projeto");
    await expect(card.locator(".wk-t")).toHaveText("Campanha de Natal");
    await snap(page, "a2d-projetos-quadro");
  });

  test("Coordenar uma campanha (catálogo do Nexo) abre o Nexo, ele pergunta antes de montar a equipe e a resposta monta o projeto", async ({ page }) => {
    test.setTimeout(120_000);
    grantLocalCredits("miolo", 10, "a2d-catalogo");
    await enterAsMarina(page, "/app/miolo/squad/nexo");
    await page.locator("button.cap-trig").and(page.getByRole("button", { name: "Ver o que dá para pedir ao Nexo" })).click();
    await page.getByRole("dialog").getByRole("button", { name: "Coordenar uma campanha" }).click();
    // Antes da A2d, este pedido abria a conversa da Bia (02.04); agora é o Nexo que coordena (V4.6 `ag: 'coord'`).
    const panel = page.getByRole("region", { name: "Conversa" });
    const field = panel.getByRole("textbox", { name: "Mensagem para o Nexo…" });
    await expect(field).toHaveValue("Quero coordenar uma campanha.");
    await field.press("Enter");
    // Sem tema nem objetivo, o Nexo pergunta antes de montar a equipe (S2d, caso "campanha sem tema").
    await expect(panel.locator(".ps-msg").filter({ hasText: "Antes de montar o time" }).first()).toBeVisible({ timeout: 45_000 });
    await expect(panel.locator(".ps-card").filter({ hasText: "Squad da campanha" })).toHaveCount(0);
    await field.fill("É para o Natal: vender mais panetones.");
    await field.press("Enter");
    const team = panel.locator(".ps-card").filter({ hasText: "Squad da campanha · o Nexo coordena" });
    await expect(team).toBeVisible({ timeout: 45_000 });
    await expect(team.locator(".ps-team-r")).toHaveCount(3);
    await snap(page, "a2d-nexo-catalogo-equipe");

    // Rejeitar tem as duas saídas (dono, 16/10 08:55): aqui, cancelar o trabalho na etapa da Bia. As etapas abertas
    // ficam não feitas e nada mais roda (o resto da suíte não herda pendência nem run deste projeto).
    await team.getByRole("button", { name: "Abrir o projeto" }).click();
    await expect(page).toHaveURL(/\/app\/miolo\/squad\/nexo\/trabalho\/[0-9a-f-]{36}$/);
    const workId = new URL(page.url()).pathname.split("/").pop() as string;
    const main = page.getByRole("main");
    await expect(stage(main, 1, "Estratégia", "Bia")).toHaveAccessibleName(/v1 aguarda você$/, { timeout: 45_000 });
    await main.locator('.ps-ent[data-step="1"]').getByRole("button", { name: "Cancelar trabalho" }).click();
    await expect(main.locator(".ps-nextd")).toContainText("Trabalho cancelado", { timeout: 30_000 });
    await expect(main.getByRole("button", { name: /^Aprovar v\d$/ })).toHaveCount(0);
    await expect(stage(main, 3, "Textos", "Otto")).toHaveAccessibleName(/Não feita$/);
    expect(sql(`select status from public.work_items where id = '${workId}'`)).toBe("cancelled");
    expect(sql(`select count(*) from public.runs where work_item_id = '${workId}' and status in ('queued', 'running')`)).toBe("0");
  });
});
