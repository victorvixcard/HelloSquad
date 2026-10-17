import type { Me } from "@hellosquad/contracts";
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
import {
  ADMIN_FORBIDDEN_PATH,
  isAdminPath,
  isAppPath,
  isLocalHttp,
  SESSION_COOKIE_OPTIONS,
  sessionCookieOptions,
} from "./session-cookie";

const AUTH_PAGES = ["/entrar", "/criar-conta"];

/** Tempo máximo da consulta do idioma do negócio: API lenta não segura a tela (cai no pt-BR, sem cookie). */
const WORKSPACE_LOCALE_TIMEOUT_MS = 2000;

/** Tempo máximo da consulta do Super Admin; sem resposta, a casca do painel pergunta de novo e mostra a falha. */
const ADMIN_GATE_TIMEOUT_MS = 3000;

/** O que a API disse sobre quem abre o painel: entra, 403 honesto, login de novo ou não respondeu. */
export type AdminGate = "admin" | "forbidden" | "login" | "unknown";

/**
 * Super Admin (SA2): quem decide é a API (`GET /admin/me`), nunca o conteúdo do token. 200 = entra;
 * 403 = página 403 honesta; 401 = login; qualquer outra resposta passa e a casca mostra a falha da API.
 */
export function adminGateOf(status: number | null): AdminGate {
  if (status === 200) return "admin";
  if (status === 403) return "forbidden";
  if (status === 401) return "login";
  return "unknown";
}

/**
 * Renova a sessão nos cookies, protege /app/* e /admin/* (o painel só abre com o 200 de `GET /admin/me`) e resolve o
 * idioma da tela (pessoa → negócio → pt-BR).
 */
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
      // fetch puro: o cliente do contracts usa API do Node que o Edge Runtime do middleware não tem (só o tipo vem dele).
      const res = await fetch(`${apiBaseUrl()}/me`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(WORKSPACE_LOCALE_TIMEOUT_MS),
        cache: "no-store",
      });
      if (!res.ok) return null;
      const me = (await res.json()) as Partial<Me>;
      return me.memberships?.find((m) => m.workspace.slug === slug)?.workspace.locale ?? null;
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

  if (!signedIn && (isAppPath(pathname) || isAdminPath(pathname))) {
    return redirectTo(`/entrar?${new URLSearchParams({ next: `${pathname}${search}` })}`);
  }

  if (signedIn && isAdminPath(pathname)) {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const status = token
      ? await fetch(`${apiBaseUrl()}/admin/me`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          signal: AbortSignal.timeout(ADMIN_GATE_TIMEOUT_MS),
          cache: "no-store",
        })
          .then((res) => res.status)
          .catch(() => null)
      : 401;
    const gate = adminGateOf(status);
    if (gate === "login") {
      return redirectTo(`/entrar?${new URLSearchParams({ sessao: "expirada", next: `${pathname}${search}` })}`);
    }
    if (gate === "forbidden" && pathname !== ADMIN_FORBIDDEN_PATH) {
      // Mesma URL na barra do navegador; o conteúdo é a página 403 no idioma da pessoa (o cabeçalho já está na requisição).
      const forbidden = NextResponse.rewrite(new URL(ADMIN_FORBIDDEN_PATH, request.url), { request });
      for (const cookie of response.cookies.getAll()) forbidden.cookies.set(cookie);
      for (const [key, value] of Object.entries(renewed.headers)) forbidden.headers.set(key, value);
      return forbidden;
    }
    if (gate === "admin" && pathname === ADMIN_FORBIDDEN_PATH) return redirectTo("/admin");
  }

  if (signedIn && AUTH_PAGES.includes(pathname)) {
    return redirectTo("/app");
  }

  return response;
}
