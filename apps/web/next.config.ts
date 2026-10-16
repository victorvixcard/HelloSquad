import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { webEnvProblems } from "./lib/env";
import { contentSecurityPolicy, SECURITY_HEADERS } from "./lib/security-headers";

// O .env do HelloSquad fica na raiz do monorepo (um só arquivo para API, banco e web).
// O web lê de lá as variáveis NEXT_PUBLIC_* e API_URL. Nunca coloque a secret key no web.
// forceReload: o Next já carregou (e guardou em cache) o env de apps/web antes de ler este arquivo.
const repoRoot = path.resolve(__dirname, "../..");
const dev = process.env.NODE_ENV !== "production";
loadEnvConfig(repoRoot, dev, { info: () => {}, error: console.error }, true);

// Falha cedo (H0-05): env inválido derruba o build e o start, em vez de virar 500 por requisição.
const envProblems = webEnvProblems(process.env);
if (envProblems.length > 0) {
  throw new Error(
    `Configuração do web inválida no .env da raiz (docs/SETUP_LOCAL.md):\n  - ${envProblems.join("\n  - ")}`,
  );
}

// CSP das páginas estáticas (sem nonce). Nas rotas do middleware ele a troca pela versão com nonce.
const staticCsp = contentSecurityPolicy({ supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, dev });

const nextConfig: NextConfig = {
  // Pacotes do monorepo publicados como código-fonte TypeScript.
  transpilePackages: ["@hellosquad/ui", "@hellosquad/contracts"],
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
  poweredByHeader: false,
  // O indicador do modo dev cobre o pé da barra lateral (conta da pessoa) nas capturas.
  devIndicators: false,
  // Mantém o host dos redirecionamentos do middleware (127.0.0.1 não vira localhost).
  skipMiddlewareUrlNormalize: true,
  // Metadados sempre no <head> do HTML inicial (A2c). Sem isto, o Next 15 manda o <title>, a description e o hreflang
  // das rotas dinâmicas (o site em en e es) no fim do <body>, por streaming, para qualquer robô fora da lista dele,
  // inclusive os assistentes de IA, que não executam JavaScript.
  htmlLimitedBots: /.*/,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...SECURITY_HEADERS, { key: "Content-Security-Policy", value: staticCsp }],
      },
      // A área logada e o Super Admin nunca entram em buscador (além do robots.txt e do robots da Metadata API).
      { source: "/app/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

// Catálogo de mensagens (ADR-0010): next-intl lê o idioma e as mensagens de i18n/request.ts.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
