import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// O .env do HelloSquad fica na raiz do monorepo (um só arquivo para API, banco e web).
// O web lê de lá as variáveis NEXT_PUBLIC_* e API_URL. Nunca coloque a secret key no web.
// forceReload: o Next já carregou (e guardou em cache) o env de apps/web antes de ler este arquivo.
const repoRoot = path.resolve(__dirname, "../..");
loadEnvConfig(repoRoot, process.env.NODE_ENV !== "production", { info: () => {}, error: console.error }, true);

const nextConfig: NextConfig = {
  // Pacotes do monorepo publicados como código-fonte TypeScript.
  transpilePackages: ["@hellosquad/ui", "@hellosquad/contracts"],
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
  poweredByHeader: false,
  // Mantém o host dos redirecionamentos do middleware (127.0.0.1 não vira localhost).
  skipMiddlewareUrlNormalize: true,
  async headers() {
    // A área logada nunca entra em buscador (além do robots da Metadata API).
    return [{ source: "/app/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
