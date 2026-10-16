import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

// Fluxos ponta a ponta contra o ambiente LOCAL: Supabase do HelloSquad (make up && make seed),
// API FastAPI na 8100 e o build de produção do web na 3100. Nada aqui fala com nuvem.
// Rode com `make e2e` (faz o build antes). O teardown reaplica o seed (remove o workspace do Pedro).
const WEB_PORT = Number(process.env.WEB_PORT || 3100);
const API_PORT = Number(process.env.API_PORT || 8100);
const repoRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "./test-results",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    locale: "pt-BR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: [
    {
      command: `make --no-print-directory -C ${repoRoot} dev-api`,
      url: `http://127.0.0.1:${API_PORT}/health`,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: `pnpm exec next start --port ${WEB_PORT} --hostname 127.0.0.1`,
      url: `http://127.0.0.1:${WEB_PORT}/entrar`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
