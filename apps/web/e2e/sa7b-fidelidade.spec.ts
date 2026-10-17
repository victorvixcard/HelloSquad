import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { signIn, snap } from "./helpers";

// SA7b: correções da H-SA no painel, como o SA0. O Vic fictício (sem negócio no seed) entra pelo /entrar sem `next` e
// cai no painel; Catálogo com versão, histórico, chips por agente e cabeçalho do agente; Pagamentos em abas com o cartão
// do provedor; Auditoria exporta o CSV da página carregada; "Informar saldo" com o primário do DS. Só leitura.

test("o Vic entra pelo /entrar e cai no painel; Catálogo, Pagamentos, Auditoria e Saúde como o SA0", async ({ page }) => {
  await page.goto("/entrar");
  await signIn(page, "vic@hellosquad.example");
  await expect(page).toHaveURL(/\/admin\/contas$/);

  // Catálogo: versão e histórico no topo, linhas de apoio, chips por agente com a contagem, cabeçalho do agente.
  await page.goto("/admin/catalogo");
  const head = page.locator(".sa-head-a");
  await expect(head).toContainText("Versão 1");
  await expect(head.getByRole("link", { name: "Ver histórico" })).toHaveAttribute("href", "/admin/auditoria?quem=platform_admin&tipo=configuration");
  await expect(page.locator(".sa-met").filter({ hasText: "Deliveries" })).toContainText("7 agentes");
  await expect(page.locator(".sa-met").filter({ hasText: "À venda" })).toContainText("nenhuma: falta preço aprovado");
  await expect(page.locator(".sa-met").filter({ hasText: "Aguardando" })).toContainText(/\d+ pelo motor · \d+ por integração/);
  const chips = page.getByRole("navigation", { name: "Filtrar por agente" });
  await expect(chips.getByRole("link", { name: "Todos 46" })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("#cat-nexo .sa-card-t small")).toContainText(/Projetos · \d+ deliveries/);
  await expect(page.locator("#cat-nexo").getByRole("link", { name: "Abrir o agente" })).toHaveAttribute("href", "/admin/squad/nexo");
  await expect(page.locator(".sa-integ .sa-chip").filter({ hasText: "LLM" }).first()).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Filtrar por agente" })).toHaveCount(0);
  await snap(page, "sa7b-catalogo");
  await chips.getByRole("link", { name: /^Otto \d+$/ }).click();
  await expect(page).toHaveURL(/\/admin\/catalogo\?agente=otto$/);
  await expect(chips.getByRole("link", { name: /^Otto \d+$/ })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("section.sa-card[id^='cat-']")).toHaveCount(1);
  await snap(page, "sa7b-catalogo-otto");

  // Pagamentos: texto sem a promessa da SA6, cartão do provedor com as linhas do SA0, abas com a de Assinaturas aberta.
  await page.goto("/admin/pagamentos");
  await expect(page.locator(".sa-desc")).toHaveText("Assinaturas, recargas, webhooks e conciliação, por provedor. As contas no Asaas e no Mercado Pago ainda não existem.");
  const asaas = page.locator("#prov-asaas");
  for (const text of ["Conta no provedor", "Ainda não criada", "Webhook", "Não configurado", "Ambiente", "Sandbox, quando a conta for criada", "PaymentProvider", "A validar", "Pix recorrente e cartão recorrente"]) {
    await expect(asaas).toContainText(text);
  }
  const tabs = page.getByRole("tablist", { name: "Pagamentos" });
  // o número depois do nome é o contador do SA0 (atrasadas, webhooks com falha, cobranças que falharam), só quando há
  await expect(tabs.getByRole("tab")).toHaveText([/^Assinaturas\d*$/, /^Recargas$/, /^Webhooks\d*$/, /^Conciliação\d*$/]);
  await expect(page.getByRole("table", { name: "Assinaturas" })).toContainText("Miolo");
  await snap(page, "sa7b-pagamentos");
  await tabs.getByRole("tab", { name: "Webhooks" }).click();
  await expect(page).toHaveURL(/#webhooks$/);
  await expect(page.getByRole("tabpanel", { name: "Webhooks" })).toContainText("Cada evento é aplicado uma vez só");
  await snap(page, "sa7b-pagamentos-webhooks");

  // Auditoria: "Exportar CSV" baixa a página carregada com os filtros de agora e avisa que é o filtro atual.
  await page.goto("/admin/auditoria?quem=platform_admin");
  const rows = await page.getByRole("table", { name: "Eventos" }).locator("tbody tr").count();
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator(".sa-head-a").getByRole("button", { name: "Exportar CSV" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^auditoria-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = readFileSync((await download.path())!, "utf8").replace(/^﻿/, "");
  const lines = csv.trimEnd().split("\r\n");
  expect(lines[0]).toBe("Quando,Quem,Conta,Tipo,Ação,Detalhe");
  expect(lines.length - 1).toBe(rows);
  expect(lines.slice(1).every((l) => l.split(",")[1]?.startsWith("Super Admin · "))).toBe(true);
  await expect(page.getByRole("status")).toContainText("desta página exportados em CSV, com os filtros atuais.");
  await snap(page, "sa7b-auditoria");

  // Saúde: "Informar saldo" com o primário do DS (tinta), não como texto.
  await page.goto("/admin/saude");
  const informar = page.getByRole("button", { name: "Informar saldo" }).first();
  await expect(informar).toHaveClass(/hs-btn--pri/);
  await expect(informar).toHaveCSS("background-color", "rgb(15, 13, 34)");
  await snap(page, "sa7b-saude");
});
