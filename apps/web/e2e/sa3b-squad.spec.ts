import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { signIn, snap } from "./helpers";

// SA3b: o Squad IA do Super Admin. O Vic fictício abre o Otto, edita uma seção da Alma (rascunho, versão 2), compara,
// publica, vê a versão nova em uso e o prompt mudar, e volta para a anterior (versão 3 com o conteúdo da 1, o prompt
// volta ao hash do seed). A Marina (owner da Miolo) recebe o 403 honesto nas telas do squad. No fim, as versões que o
// fluxo criou saem do banco local (só aqui, com os gatilhos desligados na limpeza, como o roteiro da SA3a), para o
// histórico de teste não ficar no banco do dono.

const DB = ["exec", "supabase_db_hellosquad", "psql", "-U", "postgres", "-qtAc"];
const sql = (query: string) => execFileSync("docker", [...DB, query], { encoding: "utf8" }).trim();
let before = "";

test.beforeAll(() => {
  before = sql("select coalesce(string_agg(id::text, ','), '') from public.squad_versions");
});

test.afterAll(() => {
  if (!/^[0-9a-f,-]*$/.test(before)) throw new Error("lista de versões inesperada");
  sql(
    "begin; set local session_replication_role = replica; " +
      `delete from public.agent_prompt_sections where not (version_id::text = any(string_to_array('${before}', ','))); ` +
      `delete from public.squad_versions where not (id::text = any(string_to_array('${before}', ','))); ` +
      "update public.squad_versions set status = 'active' where kind = 'soul' and agent_id = 'otto' and version = 1; commit;",
  );
});

async function enterSquad(page: Page, email: string) {
  await page.goto("/admin/squad");
  await expect(page).toHaveURL(/\/entrar\?next=%2Fadmin%2Fsquad/);
  await signIn(page, email);
}

test("o Vic abre o Otto, edita uma seção da Alma, publica, vê a versão nova e volta para a anterior", async ({ page }) => {
  await enterSquad(page, "vic@hellosquad.example");

  // Squad: os sete, com Kiwi em Growth Marketing; o Squad IA ativo na barra.
  await expect(page.getByRole("heading", { level: 1, name: "Squad" })).toBeVisible();
  const table = page.getByRole("table", { name: "Os sete" });
  for (const name of ["Nexo", "Bia", "Kaia", "Otto", "Kiwi", "Max", "Íris"]) await expect(table.getByRole("link", { name, exact: true })).toBeVisible();
  await expect(table.getByRole("row", { name: /Kiwi/ })).toContainText("Growth Marketing");
  await expect(page.getByText("Edição com versão")).toBeVisible();
  await snap(page, "sa3b-squad");

  // Agente › Alma.
  await table.getByRole("link", { name: "Otto", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/squad\/otto$/);
  await expect(page.getByRole("heading", { level: 1, name: "Otto" })).toBeVisible();
  await expect(page.getByText("6 de 6 seções entram no prompt")).toBeVisible();
  await snap(page, "sa3b-alma");

  // Editar "Como você escreve" → rascunho (versão 2, não ativa).
  const heading = (await page.locator(".sa-sec-card h3").nth(2).textContent())!.trim();
  await page.getByRole("button", { name: `Editar ${heading}` }).click();
  const body = page.getByLabel("Texto da seção (markdown)");
  const original = await body.inputValue();
  await body.fill(`${original}\n\nTexto de teste do e2e da SA3b.`);
  await page.getByLabel("Motivo (vai para a auditoria)").fill("e2e SA3b");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText("Versão 2 da Alma do Otto pronta para publicar.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Voltar para esta versão (Versão 1)" })).toHaveCount(0);

  // Comparar (GET /admin/squad/diff), lado a lado.
  await page.getByRole("button", { name: "Comparar versões" }).click();
  const diff = page.getByRole("dialog", { name: "Comparar: versão 1 e versão 2" });
  await expect(diff.getByRole("columnheader", { name: "Versão 2 · Rascunho" })).toBeVisible();
  await expect(diff.locator("ins").filter({ hasText: "Texto de teste do e2e da SA3b." })).toBeVisible();
  await snap(page, "sa3b-comparar");
  await diff.getByRole("button", { name: "Fechar" }).click();

  // Publicar, com confirmação.
  await page.getByRole("button", { name: "Publicar versão 2" }).click();
  const confirm = page.getByRole("dialog", { name: "Publicar a versão 2 da Alma do Otto?" });
  await confirm.getByRole("button", { name: "Publicar versão 2" }).click();
  await expect(page.getByText("Versão 2 publicada. Os próximos runs usam esta versão.")).toBeVisible();
  await expect(page.getByText("versão ativa v2", { exact: false })).toBeVisible();
  const versions = page.locator(".sq-vers").first();
  await expect(versions).toContainText("Versão 2");
  await expect(versions).toContainText("Substituída");

  // O que ele lê: o hash do prompt mudou com a versão nova.
  await page.getByRole("tab", { name: "O que ele lê" }).click();
  await expect(page.getByText("fb290a332565")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "regras compartilhadas + Alma" })).toContainText("Texto de teste do e2e da SA3b.");

  // Voltar para a versão 1: versão 3, já ativa, com o conteúdo da 1.
  await page.getByRole("tab", { name: "Alma" }).click();
  await page.getByRole("button", { name: "Voltar para esta versão (Versão 1)" }).click();
  const restore = page.getByRole("dialog", { name: "Voltar para a versão 1 da Alma do Otto?" });
  await restore.getByLabel("Motivo (vai para a auditoria)").fill("e2e SA3b: voltar");
  await restore.getByRole("button", { name: "Voltar para esta versão" }).click();
  await expect(page.getByText("Versão 3 ativa, com o conteúdo da versão 1.")).toBeVisible();
  await expect(page.locator(".sq-vers").first()).toContainText("voltou da versão 1");
  await snap(page, "sa3b-voltou");
  await page.getByRole("tab", { name: "O que ele lê" }).click();
  await expect(page.getByText("fb290a332565")).toBeVisible();
  await snap(page, "sa3b-le");

  // As outras abas e as Regras de negócio abrem com os dados do banco.
  await page.getByRole("tab", { name: /Skills/ }).click();
  await expect(page.getByRole("tab", { name: /04\.01/ })).toBeVisible();
  await snap(page, "sa3b-skills");
  await page.getByRole("tab", { name: "Ferramentas e limites" }).click();
  await expect(page.getByText("canais.publicar_instagram", { exact: true })).toBeVisible();
  await snap(page, "sa3b-ferramentas");
  await page.getByRole("navigation", { name: "Navegação do Super Admin" }).getByRole("link", { name: "Regras de negócio" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Regras de negócio" })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Diretrizes do dono/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Regras compartilhadas dos agentes/ })).toBeVisible();
  await snap(page, "sa3b-regras");
});

test("a Marina (owner, sem papel de plataforma) recebe o 403 honesto no Squad IA", async ({ page }) => {
  await enterSquad(page, "marina@miolo.example");
  await expect(page.getByRole("heading", { level: 1, name: "Este painel é só do Super Admin da plataforma" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegação do Super Admin" })).toHaveCount(0);
  for (const path of ["/admin/squad/otto", "/admin/regras"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: "Este painel é só do Super Admin da plataforma" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Editar/ })).toHaveCount(0);
  }
  await snap(page, "sa3b-403-marina");
});
