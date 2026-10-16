import { spawn } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const WORKER_PID_FILE = "/tmp/hellosquad-e2e-worker.pid";
export const WORKER_LOG_FILE = "/tmp/hellosquad-e2e-worker.log";

const READY = "worker no ar";
const BOOT_TIMEOUT_MS = 90_000;

/**
 * Sobe o worker do squad (`hellosquad-worker`, o mesmo do `make worker`) em modo simulado: fixtures, sem custo e
 * sem chave. Os fluxos ao vivo precisam dele para o pedido virar resposta do Otto. `E2E_WORKER=off` usa um worker
 * que já esteja rodando. O teardown para o worker antes de reaplicar o seed.
 */
export default async function globalSetup() {
  if (process.env.E2E_WORKER === "off") return;
  const backend = path.resolve(__dirname, "../../../apps/backend");
  const log = openSync(WORKER_LOG_FILE, "w");
  const child = spawn("uv", ["run", "hellosquad-worker"], {
    cwd: backend,
    env: { ...process.env, LLM_PROVIDER: "simulated" },
    stdio: ["ignore", log, log],
    detached: true,
  });
  closeSync(log);
  if (!child.pid) throw new Error("o worker do squad não subiu (uv run hellosquad-worker)");
  writeFileSync(WORKER_PID_FILE, String(child.pid));
  child.unref();

  let exited: number | null = null;
  child.on("exit", (code) => {
    exited = code ?? -1;
  });
  const started = Date.now();
  while (Date.now() - started < BOOT_TIMEOUT_MS) {
    const text = existsSync(WORKER_LOG_FILE) ? readFileSync(WORKER_LOG_FILE, "utf8") : "";
    if (text.includes(READY)) return;
    if (exited !== null) throw new Error(`o worker do squad saiu (${exited}) antes de ficar no ar:\n${text.slice(-2000)}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`o worker do squad não ficou no ar em ${BOOT_TIMEOUT_MS / 1000} s (log em ${WORKER_LOG_FILE})`);
}
