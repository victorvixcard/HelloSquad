import type { NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import { contentSecurityPolicy, createNonce } from "./lib/security-headers";

export async function middleware(request: NextRequest) {
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

// Só onde a sessão importa: a área logada e as telas de entrar, criar conta e sair.
// A página pública fica estática e não depende da Auth.
export const config = {
  matcher: ["/app", "/app/:path*", "/entrar", "/criar-conta", "/sair"],
};
