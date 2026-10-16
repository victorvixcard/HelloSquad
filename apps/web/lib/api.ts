import { ApiError, createApiClient, isApiError, unwrap, type Me } from "@hellosquad/contracts";
import { redirect } from "next/navigation";
import { cache } from "react";
import { apiBaseUrl } from "./env";
import { createSupabaseServerClient } from "./supabase/server";

/**
 * access_token da sessão nos cookies, para repassar à API. A API confere a assinatura (JWKS);
 * o web não toma decisão de acesso com base no conteúdo do token.
 */
export async function sessionAccessToken(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Cliente da API no servidor do Next, autenticado com a sessão de quem está usando. */
export async function serverApi() {
  return createApiClient({ baseUrl: apiBaseUrl(), accessToken: await sessionAccessToken() });
}

export type MeResult = { ok: true; me: Me } | { ok: false; error: ApiError };

/** GET /me uma vez por requisição. Sessão recusada pela API manda de volta para o login. */
export const loadMe = cache(async (): Promise<MeResult> => {
  let result: MeResult;
  try {
    const api = await serverApi();
    result = { ok: true, me: await unwrap(api.GET("/me")) };
  } catch (error) {
    if (!isApiError(error)) throw error;
    result = { ok: false, error };
  }
  if (!result.ok && (result.error.code === "not_authenticated" || result.error.code === "invalid_token")) {
    redirect("/entrar?sessao=expirada");
  }
  return result;
});
