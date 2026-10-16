"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { realtimeTokenAction } from "@/app/app/[workspace]/actions";
import { tokenCache } from "@/lib/live/realtime-token";
import { supabasePublicEnv } from "../env";

let client: SupabaseClient | undefined;

/** Token do Realtime pedido ao servidor (o cookie da sessão é httpOnly, H0-03). */
export const realtimeToken = tokenCache(async () => {
  const result = await realtimeTokenAction();
  return result.ok ? result.data : null;
});

/**
 * Cliente do browser só para o Realtime, com a chave publicável. A sessão não é lida aqui (cookie httpOnly): o token
 * de acesso vem de `realtimeToken`, que o Realtime chama ao entrar no canal, a cada batimento e na reconexão.
 * `supabase.auth` fica indisponível neste cliente: login, cadastro e saída são Server Actions.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!client) {
    const { url, publishableKey } = supabasePublicEnv();
    client = createClient(url, publishableKey, { accessToken: async () => (await realtimeToken.get()) ?? "" });
  }
  return client;
}
