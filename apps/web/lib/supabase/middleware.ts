import { createApiClient } from "@hellosquad/contracts";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  LOCALE_HEADER,
  resolveRequestLocale,
  userLocaleFromClaims,
  WORKSPACE_LOCALE_COOKIE,
  WORKSPACE_LOCALE_MAX_AGE_S,
} from "@/i18n/resolve";
import { apiBaseUrl, supabasePublicEnv } from "../env";
import { isAppPath, isLocalHttp, SESSION_COOKIE_OPTIONS, sessionCookieOptions } from "./session-cookie";

const AUTH_PAGES = ["/entrar", "/criar-conta"];

/** Tempo máximo da consulta do idioma do negócio: API lenta não segura a tela (cai no pt-BR, sem cookie). */
const WORKSPACE_LOCALE_TIMEOUT_MS = 2000;

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

  const { pathname, search } = request.nextUrl;

  // Idioma (ADR-0010, H2-04): o da pessoa (user_metadata.locale); sem ele, o do negócio da rota (/app/<slug>/…), do
  // cookie ou da API; por fim pt-BR. O next-intl lê o cabeçalho; a resposta é refeita para levar a requisição nova.
  const screen = await resolveRequestLocale({
    user: userLocaleFromClaims(data?.claims),
    pathname: signedIn ? pathname : "",
    cookie: request.cookies.get(WORKSPACE_LOCALE_COOKIE)?.value,
    workspaceLocale: async (slug) => {
      // Só pela nossa API (a Data API do Supabase fica desligada em produção); a API confere o token.
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) return null;
      const api = createApiClient({ baseUrl: apiBaseUrl(), accessToken: token });
      const { data: me } = await api.GET("/me", { signal: AbortSignal.timeout(WORKSPACE_LOCALE_TIMEOUT_MS) });
      return me?.memberships.find((m) => m.workspace.slug === slug)?.workspace.locale ?? null;
    },
  });
  request.headers.set(LOCALE_HEADER, screen.locale);
  const response = NextResponse.next({ request });
  for (const { name, value, options } of renewed.cookies) response.cookies.set(name, value, sessionCookieOptions(options, local));
  for (const [key, value] of Object.entries(renewed.headers)) response.headers.set(key, value);
  if (screen.cookie) {
    response.cookies.set(WORKSPACE_LOCALE_COOKIE, screen.cookie, {
      httpOnly: true,
      sameSite: "lax",
      path: "/app",
      secure: !local,
      maxAge: WORKSPACE_LOCALE_MAX_AGE_S,
    });
  }

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
