import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_HEADER, publicLocaleOf } from "./i18n/resolve";
import { updateSession } from "./lib/supabase/middleware";
import { ACTION_PATH_HEADER, isAppPath } from "./lib/supabase/session-cookie";
import { contentSecurityPolicy, createNonce } from "./lib/security-headers";

const SESSION_PAGES = ["/entrar", "/criar-conta", "/sair"];

export async function middleware(request: NextRequest) {
  // Server Action (cabeçalho Next-Action) em qualquer rota: o caminho real segue num cabeçalho que só o middleware
  // grava, por cima do que vier do browser; a ação do token do Realtime só responde na área logada (H1-10).
  if (request.headers.has("next-action")) request.headers.set(ACTION_PATH_HEADER, request.nextUrl.pathname);
  else request.headers.delete(ACTION_PATH_HEADER);
  // O idioma da tela só vem do middleware (ADR-0010); o cabeçalho que chegar do browser não vale.
  request.headers.delete(LOCALE_HEADER);
  const { pathname } = request.nextUrl;
  // Site público por idioma: /en, /es e as páginas abaixo deles (o pt-BR é estático, fora do middleware).
  const publicLocale = publicLocaleOf(pathname);
  if (publicLocale) {
    request.headers.set(LOCALE_HEADER, publicLocale);
    return NextResponse.next({ request });
  }
  if (!isAppPath(pathname) && !SESSION_PAGES.includes(pathname)) return NextResponse.next({ request });

  // CSP com nonce por requisição. O Next lê o nonce deste cabeçalho da requisição e o põe nos
  // próprios scripts; por isso toda página coberta pelo matcher precisa ser dinâmica.
  const csp = contentSecurityPolicy({
    nonce: createNonce(),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    dev: process.env.NODE_ENV === "development",
  });
  request.headers.set("Content-Security-Policy", csp);
  const response = await updateSession(request);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

// Só onde a sessão ou o idioma importam: a área logada, as telas de entrar, criar conta e sair, e o site em en e es.
// A página pública fica estática e não depende da Auth; nela o middleware só vê os POSTs de Server Action.
export const config = {
  matcher: [
    "/app",
    "/app/:path*",
    "/entrar",
    "/criar-conta",
    "/sair",
    "/en",
    "/en/:path*",
    "/es",
    "/es/:path*",
    { source: "/((?!_next/static|_next/image).*)", has: [{ type: "header", key: "next-action" }] },
  ],
};
