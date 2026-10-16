import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { OUT_SCHEMA, renderSchema } from "../scripts/generate";
import { ApiError, createApiClient, isApiError, unwrap } from "../src";

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

const BASE = "http://api.local.example";

const ME = {
  user: { id: "u-1", email: "marina@miolo.example", full_name: "Marina Costa" },
  memberships: [{ workspace: { id: "w-1", slug: "miolo", name: "Miolo" }, role: "owner" }],
};

describe("tipos gerados do contrato", () => {
  it("src/schema.ts está em dia com openapi.json (rode pnpm --filter contracts generate)", async () => {
    expect(readFileSync(OUT_SCHEMA, "utf8")).toBe(await renderSchema());
  });
});

describe("cliente da API", () => {
  it("injeta Authorization: Bearer com o access_token e devolve os dados", async () => {
    const seen: Request[] = [];
    const fetch = vi.fn(async (request: Request) => {
      seen.push(request);
      return jsonResponse(200, ME);
    });
    const api = createApiClient({ baseUrl: BASE, accessToken: "token-da-marina", fetch });
    const me = await unwrap(api.GET("/me"));
    expect(me.user.full_name).toBe("Marina Costa");
    expect(me.memberships[0].workspace.slug).toBe("miolo");
    expect(seen[0].url).toBe(`${BASE}/me`);
    expect(seen[0].headers.get("Authorization")).toBe("Bearer token-da-marina");
  });

  it("aceita o token por função (lido a cada chamada) e não manda cabeçalho sem token", async () => {
    const seen: Request[] = [];
    const fetch = async (request: Request) => {
      seen.push(request);
      return jsonResponse(200, { items: [] });
    };
    let token: string | null = "primeiro";
    const api = createApiClient({ baseUrl: BASE, accessToken: async () => token, fetch });
    await unwrap(api.GET("/workspaces"));
    token = null;
    await unwrap(api.GET("/workspaces"));
    expect(seen[0].headers.get("Authorization")).toBe("Bearer primeiro");
    expect(seen[1].headers.has("Authorization")).toBe(false);
  });

  it("POST /workspaces manda o corpo em JSON", async () => {
    let body: unknown;
    const fetch = async (request: Request) => {
      body = await request.json();
      return jsonResponse(201, { id: "w-2", slug: "pedro-teste", name: "Pedro Teste", role: "owner", created_at: "2026-10-16T04:00:00Z" });
    };
    const api = createApiClient({ baseUrl: BASE, accessToken: "t", fetch });
    const ws = await unwrap(api.POST("/workspaces", { body: { name: "Pedro Teste", slug: "pedro-teste" } }));
    expect(body).toEqual({ name: "Pedro Teste", slug: "pedro-teste" });
    expect(ws.role).toBe("owner");
  });
});

describe("erros: envelope da API vira ApiError tipado", () => {
  it("409 slug_taken", async () => {
    const fetch = async () =>
      jsonResponse(409, {
        error: { code: "slug_taken", message: "Já existe um workspace com esse endereço (slug).", details: [] },
      });
    const api = createApiClient({ baseUrl: BASE, accessToken: "t", fetch });
    const error = await unwrap(api.POST("/workspaces", { body: { name: "Miolo", slug: "miolo" } })).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(isApiError(error, "slug_taken")).toBe(true);
    expect(error.status).toBe(409);
    expect(error.message).toBe("Já existe um workspace com esse endereço (slug).");
  });

  it("422 validation_error preserva os detalhes por campo", async () => {
    const details = [{ field: "slug", message: "Use de 3 a 48 caracteres." }];
    const fetch = async () =>
      jsonResponse(422, { error: { code: "validation_error", message: "Dados inválidos.", details } });
    const api = createApiClient({ baseUrl: BASE, accessToken: "t", fetch });
    const error = await unwrap(api.POST("/workspaces", { body: { name: "X", slug: "x" } })).catch((e) => e);
    expect(isApiError(error, "validation_error")).toBe(true);
    expect(error.details).toEqual(details);
  });

  it("401 invalid_token", async () => {
    const fetch = async () =>
      jsonResponse(401, {
        error: { code: "invalid_token", message: "Token de acesso inválido ou expirado. Faça login de novo.", details: [] },
      });
    const api = createApiClient({ baseUrl: BASE, accessToken: "vencido", fetch });
    const error = await unwrap(api.GET("/me")).catch((e) => e);
    expect(isApiError(error, "invalid_token")).toBe(true);
    expect(error.status).toBe(401);
  });

  it("resposta fora do envelope vira unexpected_response, com mensagem em português", async () => {
    const fetch = async () =>
      new Response("<html>Bad Gateway</html>", { status: 502, headers: { "Content-Type": "text/html" } });
    const api = createApiClient({ baseUrl: BASE, fetch });
    const error = await unwrap(api.GET("/me")).catch((e) => e);
    expect(isApiError(error, "unexpected_response")).toBe(true);
    expect(error.status).toBe(502);
    expect(error.message).toContain("HTTP 502");
  });

  it("API fora do ar vira network_error (status 0)", async () => {
    const fetch = async () => {
      throw new TypeError("fetch failed");
    };
    const api = createApiClient({ baseUrl: BASE, fetch });
    const error = await unwrap(api.GET("/me")).catch((e) => e);
    expect(isApiError(error, "network_error")).toBe(true);
    expect(error.status).toBe(0);
    expect(error.message).toMatch(/API do HelloSquad/);
  });
});
