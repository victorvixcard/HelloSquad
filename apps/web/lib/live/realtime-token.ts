/**
 * Token de acesso do Realtime no browser (H0-03): vem do servidor (o cookie da sessão é httpOnly) e fica em memória.
 * Pede de novo quando falta menos de um minuto para vencer; pedidos ao mesmo tempo esperam o mesmo resultado.
 */
export type TokenGrant = { token: string; expiresAt: number };
export type FetchToken = () => Promise<TokenGrant | null>;

/** Margem antes do vencimento (s): o batimento do Realtime (25 s) pega o token novo antes do antigo vencer. */
const MARGIN_S = 60;

export function tokenCache(fetchToken: FetchToken, now: () => number = () => Date.now() / 1000) {
  let grant: TokenGrant | null = null;
  let inflight: Promise<TokenGrant | null> | null = null;
  return {
    /** Token válido, ou null sem sessão (o canal privado cai e a reconexão tenta de novo). */
    async get(): Promise<string | null> {
      if (grant && grant.expiresAt - now() > MARGIN_S) return grant.token;
      inflight ??= fetchToken()
        .catch(() => null)
        .finally(() => {
          inflight = null;
        });
      grant = await inflight;
      return grant?.token ?? null;
    },
    clear() {
      grant = null;
    },
  };
}
