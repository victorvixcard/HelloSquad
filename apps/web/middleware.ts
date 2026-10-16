import type { NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

// Só onde a sessão importa: a área logada e as telas de entrar, criar conta e sair.
// A página pública fica estática e não depende da Auth.
export const config = {
  matcher: ["/app", "/app/:path*", "/entrar", "/criar-conta", "/sair"],
};
