// Variáveis do web. Vêm do .env da raiz (carregado em next.config.ts); ver docs/SETUP_LOCAL.md.
// As NEXT_PUBLIC_* precisam aparecer literalmente aqui para o Next embutir no bundle do browser.

export type SupabasePublicEnv = { url: string; publishableKey: string };

export function supabasePublicEnv(): SupabasePublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no .env da raiz (docs/SETUP_LOCAL.md).",
    );
  }
  // A chave secreta ignora a RLS e nunca pode chegar ao browser.
  if (publishableKey.startsWith("sb_secret_")) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY recebeu a chave secreta. Use a publicável (sb_publishable_…).");
  }
  return { url, publishableKey };
}

/**
 * Validação no boot (next.config.ts, roda no build e no start): devolve os problemas em português.
 * Nunca repete o valor, que pode ser a chave secreta. O guard de supabasePublicEnv() continua.
 */
export function webEnvProblems(env: NodeJS.ProcessEnv): string[] {
  const problems: string[] = [];
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    problems.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY está vazia. Use a chave publicável (sb_publishable_…).");
  } else if (key.startsWith("sb_secret_")) {
    problems.push(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY recebeu a chave secreta (sb_secret_…), que ignora a RLS e nunca pode ir para o browser. Use a publicável (sb_publishable_…).",
    );
  } else if (!key.startsWith("sb_publishable_")) {
    problems.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY não começa com sb_publishable_. Use a chave publicável.");
  }
  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "API_URL"] as const) {
    if (!isHttpUrl(env[name])) problems.push(`${name} ausente ou inválida: esperado um endereço http(s)://…`);
  }
  return problems;
}

function isHttpUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/** Endereço da API FastAPI, usado só no servidor do Next (Server Components e Server Actions). */
export function apiBaseUrl(): string {
  return process.env.API_URL || `http://127.0.0.1:${process.env.API_PORT || "8100"}`;
}

/** Endereço público do site, para canonical, sitemap e Open Graph. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3100").replace(/\/$/, "");
}
