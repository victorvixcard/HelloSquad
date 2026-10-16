// Cabeçalhos de segurança do web (H0-02). O next.config.ts aplica em todas as rotas; o middleware
// troca a Content-Security-Policy pela versão com nonce nas rotas que ele cobre (todas dinâmicas).
// Sem HSTS: só faz sentido sob HTTPS (Fase 5). Roda no Node (next.config) e no Edge (middleware).

type CspOptions = {
  /** Nonce desta resposta. Sem nonce = página estática, gerada no build. */
  nonce?: string;
  /** NEXT_PUBLIC_SUPABASE_URL: a Auth que o browser pode chamar. */
  supabaseUrl?: string;
  dev: boolean;
};

/** Origem da Auth do Supabase. Local, 127.0.0.1 e localhost são origens diferentes: vão as duas. */
function supabaseOrigins(supabaseUrl: string | undefined): string[] {
  if (!supabaseUrl) return [];
  const { protocol, hostname, port, origin } = new URL(supabaseUrl);
  const loopback = { "127.0.0.1": "localhost", localhost: "127.0.0.1" }[hostname];
  return loopback ? [origin, `${protocol}//${loopback}${port ? `:${port}` : ""}`] : [origin];
}

export function contentSecurityPolicy({ nonce, supabaseUrl, dev }: CspOptions): string {
  // Com nonce, só roda o script inline que o Next marcou nesta resposta. Página estática não tem
  // nonce por requisição: os scripts inline do RSC precisam de 'unsafe-inline' (pendência da A0b).
  const script = nonce ? ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"] : ["'self'", "'unsafe-inline'"];
  // O React em desenvolvimento usa eval (pilha de erro e Fast Refresh); o build de produção, não.
  if (dev) script.push("'unsafe-eval'");
  return [
    "default-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    `script-src ${script.join(" ")}`,
    // Os componentes do DS usam style="" e nonce não cobre atributo: 'unsafe-inline' só nos estilos.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${["'self'", ...supabaseOrigins(supabaseUrl)].join(" ")}`,
  ].join("; ");
}

/** Cabeçalhos fixos, iguais em toda resposta. */
export const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Nada de câmera, microfone, localização, pagamento ou USB até uma tela precisar.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

/** Nonce de 128 bits em base64, um por requisição (Web Crypto: serve no Edge e no Node). */
export function createNonce(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
}
