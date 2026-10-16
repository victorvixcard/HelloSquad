import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACTION_PATH_HEADER, isLocalHttp, SESSION_MAX_AGE_S, sessionCookieOptions } from "@/lib/supabase/session-cookie";

const state = vi.hoisted(() => ({ path: null as string | null, forwarded: false }));
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({
      ...(state.path === null ? {} : { "x-hellosquad-action-path": state.path }),
      ...(state.forwarded ? { "x-action-forwarded": "1" } : {}),
    }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: "eyJ.fake.token", expires_at: 1_800_000_000 } } }) },
  }),
}));
vi.mock("@/lib/api", () => ({ serverApi: vi.fn() }));

describe("cookie da sessão (H1-10)", () => {
  it("é local só em http no 127.0.0.1, localhost ou [::1]; qualquer outro endereço leva Secure", () => {
    expect(isLocalHttp("127.0.0.1:3100", "http")).toBe(true);
    expect(isLocalHttp("localhost:3100", "http:")).toBe(true);
    expect(isLocalHttp("[::1]:3100", null)).toBe(true);
    expect(isLocalHttp("127.0.0.1:3100", "https")).toBe(false);
    expect(isLocalHttp("app.hellosquad.example", "https")).toBe(false);
    expect(isLocalHttp("app.hellosquad.example", "http")).toBe(false);
    expect(isLocalHttp("192.168.0.10:3100", "http")).toBe(false);
    expect(isLocalHttp(null, null)).toBe(false);
  });

  it("grava httpOnly, Secure fora do local e 7 dias no lugar dos 400 do @supabase/ssr; remover continua removendo", () => {
    const ssr = { path: "/", sameSite: "lax" as const, httpOnly: false, maxAge: 400 * 24 * 60 * 60 };
    expect(sessionCookieOptions(ssr, true)).toEqual({ path: "/", sameSite: "lax", httpOnly: true, secure: false, maxAge: SESSION_MAX_AGE_S });
    expect(sessionCookieOptions(ssr, false)).toEqual({ path: "/", sameSite: "lax", httpOnly: true, secure: true, maxAge: 604_800 });
    expect(sessionCookieOptions({ ...ssr, maxAge: 0 }, false)).toMatchObject({ maxAge: 0, secure: true, httpOnly: true });
  });
});

describe("ação do token do Realtime só na área logada (H1-10)", () => {
  beforeEach(() => {
    state.path = null;
    state.forwarded = false;
  });

  async function action() {
    const real = await vi.importActual<typeof import("@/app/app/[workspace]/actions")>("@/app/app/[workspace]/actions");
    return real.realtimeTokenAction();
  }

  it("chamada em /app/<negócio> devolve o token da sessão", async () => {
    state.path = "/app/miolo";
    expect(await action()).toEqual({ ok: true, data: { token: "eyJ.fake.token", expiresAt: 1_800_000_000 } });
  });

  it("chamada na página pública /, em /sair ou sem o caminho do middleware não devolve token", async () => {
    for (const path of ["/", "/sair", "/entrar", "/application", null]) {
      state.path = path;
      expect(await action()).toEqual({ ok: false, code: "not_found", message: "" });
    }
    expect(ACTION_PATH_HEADER).toBe("x-hellosquad-action-path");
  });

  it("chamada numa rota sem a ação chega encaminhada pelo Next a uma página do app e é recusada", async () => {
    // POST em / com o id da ação: o Next encaminha para app/app/[workspace]/page e o middleware vê /app/[workspace].
    state.path = "/app/[workspace]";
    state.forwarded = true;
    expect(await action()).toEqual({ ok: false, code: "not_found", message: "" });
  });
});
