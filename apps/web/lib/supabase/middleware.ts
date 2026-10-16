import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_HEADER, resolveLocale, userLocaleFromClaims } from "@/i18n/resolve";
import { supabasePublicEnv } from "../env";
import { isAppPath, isLocalHttp, SESSION_COOKIE_OPTIONS, sessionCookieOptions } from "./session-cookie";

const AUTH_PAGES = ["/entrar", "/criar-conta"];

/** Renova a sessão nos cookies, protege /app/* e resolve o idioma da tela (pessoa → negócio → pt-BR). */
export async function updateSession(request: NextRequest) {
  // O que a renovação da sessão gravou, para refazer a resposta depois de pôr o idioma na requisição.
  const renewed: { cookies: { name: string; value: string; options: CookieOptions }[]; headers: Record<string, string> } = {
    cookies: [],
    headers: {},
  };
  const { url, publishableKey } = supabasePublicEnv();
  const local = isLocalHttp(
    request.headers.get("host") ?? request.nextUrl.host,
    request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol,
  );
  const supabase = createServerClient(url, publishableKey, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        renewed.cookies = cookiesToSet;
        renewed.headers = { ...(headers ?? {}) };
      },
    },
  });

  // getClaims confere a assinatura do JWT (JWKS da Auth) e renova a sessão vencida.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  // Idioma (ADR-0010): o da pessoa (user_metadata.locale) e, sem ele, o do negócio, que a API ainda não devolve
  // (pedido à S2b); por fim pt-BR. O next-intl lê o cabeçalho; a resposta é refeita para levar a requisição nova.
  request.headers.set(LOCALE_HEADER, resolveLocale({ user: userLocaleFromClaims(data?.claims) }).locale);
  const response = NextResponse.next({ request });
  for (const { name, value, options } of renewed.cookies) response.cookies.set(name, value, sessionCookieOptions(options, local));
  for (const [key, value] of Object.entries(renewed.headers)) response.headers.set(key, value);
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
