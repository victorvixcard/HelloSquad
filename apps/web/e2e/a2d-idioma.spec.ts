import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { signIn } from "./helpers";

// A2d (H2-04): a ordem de idioma da área logada é pessoa → negócio → pt-BR (ADR-0010). Antes, quem não escolheu
// idioma via pt-BR num negócio em en (o e-mail da mesma pessoa já chegava em en). O negócio vai para en e a Carla
// ganha es pelo banco local (como o PATCH do owner e a escolha da pessoa fariam); o fim do teste desfaz os dois e o
// teardown ainda reaplica o seed.

function sql(query: string) {
  execFileSync("docker", ["exec", "supabase_db_hellosquad", "psql", "-U", "postgres", "-qtAc", query], { stdio: "pipe" });
}

async function enter(page: Page, email: string) {
  await page.goto(`/entrar?next=${encodeURIComponent("/app/vitta")}`);
  await signIn(page, email);
  await page.waitForURL((url) => url.pathname === "/app/vitta", { timeout: 30_000 });
}

test.describe("Idioma da área logada (A2d, H2-04)", () => {
  test.beforeAll(() => {
    sql("update public.workspaces set locale = 'en' where slug = 'vitta'");
    sql(
      "update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{\"locale\": \"es\"}'::jsonb " +
        "where email = 'carla@vitta.example'",
    );
  });

  test.afterAll(() => {
    sql("update public.workspaces set locale = 'pt-BR' where slug = 'vitta'");
    sql("update auth.users set raw_user_meta_data = raw_user_meta_data - 'locale' where email = 'carla@vitta.example'");
  });

  test("sem idioma próprio, o Rafael vê a Vitta no idioma do negócio (en)", async ({ page }) => {
    await enter(page, "rafael@vitta.example");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    const nav = page.getByRole("navigation", { name: "HelloSquad" });
    await expect(nav.getByRole("link", { name: /^Home$/ })).toBeVisible();
  });

  test("com idioma próprio (es), a Carla vê a Vitta no dela, não no do negócio", async ({ page }) => {
    await enter(page, "carla@vitta.example");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    const nav = page.getByRole("navigation", { name: "HelloSquad" });
    await expect(nav.getByRole("link", { name: /^Inicio$/ })).toBeVisible();
  });
});
