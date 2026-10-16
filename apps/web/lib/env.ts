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

/** Endereço da API FastAPI, usado só no servidor do Next (Server Components e Server Actions). */
export function apiBaseUrl(): string {
  return process.env.API_URL || `http://127.0.0.1:${process.env.API_PORT || "8100"}`;
}

/** Endereço público do site, para canonical, sitemap e Open Graph. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3100").replace(/\/$/, "");
}
