import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { WORKER_PID_FILE } from "./global-setup";

const repoRoot = path.resolve(__dirname, "../../..");

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Para o worker que o setup subiu (grupo de processos: o `uv` e o Python), com espera e, no fim, SIGKILL. */
async function stopWorker() {
  if (!existsSync(WORKER_PID_FILE)) return;
  const pid = Number(readFileSync(WORKER_PID_FILE, "utf8"));
  rmSync(WORKER_PID_FILE, { force: true });
  if (!pid || !alive(pid)) return;
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    process.kill(pid, "SIGTERM");
  }
  const started = Date.now();
  while (alive(pid) && Date.now() - started < 15_000) await new Promise((resolve) => setTimeout(resolve, 200));
  if (alive(pid)) process.kill(-pid, "SIGKILL");
}

// O fluxo do Pedro cria um workspace de teste e o fluxo ao vivo cria trabalho, entrega e decisão. O seed devolve o
// banco local ao estado documentado, que os testes pgTAP e de integração esperam.
// `make e2e` já segura a trava do banco (flock) e avisa por HELLOSQUAD_DB_LOCK_HELD: aqui o seed roda direto,
// porque um `make seed` dentro da trava esperaria por ela mesma (30 min e falha). Fora do make, `make seed` pega a trava.
export default async function globalTeardown() {
  await stopWorker();
  if (process.env.HELLOSQUAD_DB_LOCK_HELD === "1") {
    execFileSync("uv", ["run", "hellosquad-local-db", "seed", "../../supabase/seed.sql"], {
      cwd: path.join(repoRoot, "apps/backend"),
      stdio: "inherit",
    });
    return;
  }
  execFileSync("make", ["--no-print-directory", "seed"], { cwd: repoRoot, stdio: "inherit" });
}
