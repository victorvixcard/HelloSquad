/**
 * Cookies da sessão da Auth (`sb-*-auth-token`) só para o servidor: JavaScript da página não lê (H0-03, decisão da
 * A1a). Login, cadastro, saída e renovação já acontecem no servidor (Server Actions e middleware); o Realtime do
 * browser recebe só o token de acesso, por `realtimeTokenAction`, nunca o refresh token.
 */
export const SESSION_COOKIE_OPTIONS = { httpOnly: true } as const;

/**
 * Validade do cookie da sessão (H1-10): 7 dias sem uso. O cookie é regravado a cada renovação do token (1 h,
 * `jwt_expiry`), então quem usa o produto não cai; o que acaba é o refresh token esquecido num navegador por 400 dias.
 * A Auth local não tem fim de sessão configurado (`[auth.sessions]` comentado no `supabase/config.toml`).
 */
export const SESSION_MAX_AGE_S = 7 * 24 * 60 * 60;

const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);

/** Desenvolvimento local (http em 127.0.0.1 ou localhost): sem `Secure`, que o navegador recusaria em http. */
export function isLocalHttp(host: string | null | undefined, proto: string | null | undefined): boolean {
  const name = (host ?? "").trim().toLowerCase().replace(/:\d+$/, "");
  return LOOPBACK.has(name) && (proto ?? "").replace(/:$/, "").toLowerCase() !== "https";
}

/**
 * Opções de cada cookie da sessão na hora de gravar. O `@supabase/ssr` (0.12) põe `maxAge` de 400 dias por cima de
 * `cookieOptions`, então a validade e o `Secure` se aplicam aqui; remover (`maxAge: 0`) continua removendo.
 */
export function sessionCookieOptions<T extends { maxAge?: number }>(options: T, local: boolean) {
  return {
    ...options,
    ...SESSION_COOKIE_OPTIONS,
    secure: !local,
    ...(options.maxAge === 0 ? {} : { maxAge: SESSION_MAX_AGE_S }),
  };
}

/** Cabeçalho que só o middleware grava: o caminho em que a Server Action foi chamada (H1-10). */
export const ACTION_PATH_HEADER = "x-hellosquad-action-path";

/** A área logada: `/app` e o que vem abaixo dela. */
export function isAppPath(pathname: string): boolean {
  return pathname === "/app" || pathname.startsWith("/app/");
}

/** O painel do Super Admin (SA2): `/admin` e o que vem abaixo dele. Mesma aplicação, mesma sessão. */
export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/** Página 403 honesta do painel: o middleware reescreve para ela quando a API responde `platform_admin_only`. */
export const ADMIN_FORBIDDEN_PATH = "/admin/sem-acesso";
