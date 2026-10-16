import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublicEnv } from "../env";

const AUTH_PAGES = ["/entrar", "/criar-conta"];

function isAppPath(pathname: string) {
  return pathname === "/app" || pathname.startsWith("/app/");
}

/** Renova a sessão nos cookies e protege /app/*. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = supabasePublicEnv();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // getClaims confere a assinatura do JWT (JWKS da Auth) e renova a sessão vencida.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  // O redirecionamento fica no host que a pessoa usou (127.0.0.1 ou localhost), onde estão os
  // cookies da sessão. Sem skipMiddlewareUrlNormalize (next.config.ts), o Next trocaria
  // 127.0.0.1 por localhost no Location.
  const redirectTo = (pathAndQuery: string) => {
    const host = request.headers.get("host") ?? request.nextUrl.host;
    const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
    const target = new URL(pathAndQuery, `${proto}://${host}`);
    const redirect = new NextResponse(null, { status: 307, headers: { Location: target.toString() } });
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };

  if (!signedIn && isAppPath(pathname)) {
    return redirectTo(`/entrar?${new URLSearchParams({ next: `${pathname}${search}` })}`);
  }

  if (signedIn && AUTH_PAGES.includes(pathname)) {
    return redirectTo("/app");
  }

  return response;
}
