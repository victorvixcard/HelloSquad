/**
 * Cookies da sessão da Auth (`sb-*-auth-token`) só para o servidor: JavaScript da página não lê (H0-03, decisão da
 * A1a). Login, cadastro, saída e renovação já acontecem no servidor (Server Actions e middleware); o Realtime do
 * browser recebe só o token de acesso, por `realtimeTokenAction`, nunca o refresh token.
 */
export const SESSION_COOKIE_OPTIONS = { httpOnly: true } as const;
