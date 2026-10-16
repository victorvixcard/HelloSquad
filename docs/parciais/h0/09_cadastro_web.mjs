// H0, alvo 7 (lado web) — validação do formulário de cadastro. Não cria usuário: só exercita erros
// de validação (nome vazio, e-mail inválido, senha curta) e o e-mail duplicado (marina já existe).
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const require = createRequire("/home/vitao/projetos/hellosquad/apps/web/");
const pw = await import(pathToFileURL(require.resolve("@playwright/test")));
const chromium = pw.chromium ?? pw.default?.chromium;

const WEB = "http://127.0.0.1:3100";
const out = [];
const log = (...a) => out.push(a.join(" "));
const browser = await chromium.launch();
const page = await browser.newContext({ baseURL: WEB }).then((c) => c.newPage());

async function submitSignup({ nome, email, senha }) {
  await page.goto("/criar-conta");
  if (nome !== undefined) await page.getByLabel("Seu nome").fill(nome);
  if (email !== undefined) await page.getByLabel("Seu e-mail").fill(email);
  if (senha !== undefined) await page.getByLabel("Crie uma senha").fill(senha);
  await page.getByRole("button", { name: /Criar conta/i }).click();
  await page.waitForTimeout(600);
  const errs = await page.locator(".hs-form-err, [role=alert], [aria-live]").allInnerTexts();
  return errs.map((e) => e.trim()).filter(Boolean).join(" | ");
}

log("nome vazio + e-mail inválido + senha curta -> " + (await submitSignup({ nome: "", email: "arroba-sem-dominio", senha: "123" })));
log("e-mail válido, senha 5 chars             -> " + (await submitSignup({ nome: "Teste H0", email: "h0@teste.example", senha: "12345" })));
log("e-mail sem ponto no domínio              -> " + (await submitSignup({ nome: "Teste H0", email: "x@y", senha: "123456" })));
log("usuário no caminho ainda em /criar-conta -> " + new URL(page.url()).pathname);

// e-mail duplicado: marina já existe. Não cria nada.
const dup = await submitSignup({ nome: "Marina", email: "marina@miolo.example", senha: "Senha!Teste123" });
log("e-mail duplicado (marina)                -> " + (dup || "(sem erro visível)") + "  | URL: " + new URL(page.url()).pathname);

// confere que nenhum usuário novo foi criado (auth.users deve seguir em 5)
console.log(out.join("\n"));
await browser.close();
