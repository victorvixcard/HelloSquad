"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabasePublicEnv } from "../env";

let client: ReturnType<typeof createBrowserClient> | undefined;

/** Cliente da Auth no browser (mesma sessão dos cookies). Só com a chave publicável. */
export function getSupabaseBrowserClient() {
  if (!client) {
    const { url, publishableKey } = supabasePublicEnv();
    client = createBrowserClient(url, publishableKey);
  }
  return client;
}
