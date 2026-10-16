import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { supabasePublicEnv } from "../env";
import { isLocalHttp, SESSION_COOKIE_OPTIONS, sessionCookieOptions } from "./session-cookie";

/**
 * Cliente da Auth no servidor (Server Components, Server Actions, Route Handlers), com a sessão
 * nos cookies. Em Server Component o Next não deixa gravar cookie: a renovação da sessão fica com o
 * middleware, por isso o setAll ignora o erro nesse caso.
 */
export async function createSupabaseServerClient() {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const local = isLocalHttp(requestHeaders.get("host"), requestHeaders.get("x-forwarded-proto"));
  const { url, publishableKey } = supabasePublicEnv();
  return createServerClient(url, publishableKey, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, sessionCookieOptions(options, local));
        } catch {
          // Server Component: o middleware renova a sessão na próxima requisição.
        }
      },
    },
  });
}
