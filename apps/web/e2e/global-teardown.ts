import { execFileSync } from "node:child_process";
import path from "node:path";

// O fluxo do Pedro cria um workspace de teste. `make seed` devolve o banco local ao estado
// documentado (Pedro sem membership), que os testes pgTAP e de integração esperam.
export default function globalTeardown() {
  execFileSync("make", ["--no-print-directory", "seed"], {
    cwd: path.resolve(__dirname, "../../.."),
    stdio: "inherit",
  });
}
