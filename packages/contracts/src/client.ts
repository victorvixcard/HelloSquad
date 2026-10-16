import createClient from "openapi-fetch";
import type { components, paths } from "./schema";

export type Schemas = components["schemas"];
export type Me = Schemas["Me"];
export type Membership = Schemas["Membership"];
export type Workspace = Schemas["Workspace"];
export type WorkspaceCreate = Schemas["WorkspaceCreate"];
export type WorkspaceRole = Schemas["WorkspaceRole"];
export type ErrorBody = Schemas["ErrorBody"];
export type ErrorDetail = Schemas["ErrorDetail"];

/**
 * Códigos que a API usa hoje (o campo é string: códigos novos não quebram o cliente).
 * network_error e unexpected_response são do cliente: a API não respondeu, ou respondeu fora do envelope.
 */
export type KnownErrorCode =
  | "not_authenticated"
  | "invalid_token"
  | "auth_unavailable"
  | "forbidden"
  | "conflict"
  | "workspace_not_found"
  | "slug_taken"
  | "validation_error"
  | "not_found"
  | "method_not_allowed"
  | "database_unavailable"
  | "internal_error"
  | "network_error"
  | "unexpected_response";

/** Erro tipado a partir do envelope {"error": {"code", "message", "details"}} da API. */
export class ApiError extends Error {
  override readonly name = "ApiError";
  readonly status: number;
  readonly code: KnownErrorCode | (string & {});
  readonly details: ErrorDetail[];

  constructor(status: number, code: string, message: string, details: ErrorDetail[] = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown, code?: KnownErrorCode): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}

function isErrorEnvelope(body: unknown): body is { error: ErrorBody } {
  if (typeof body !== "object" || body === null || !("error" in body)) return false;
  const error = (body as { error: unknown }).error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as ErrorBody).code === "string" &&
    typeof (error as ErrorBody).message === "string"
  );
}

/** Converte uma resposta de erro da API em ApiError. */
export function toApiError(response: Response, body: unknown): ApiError {
  if (isErrorEnvelope(body)) {
    return new ApiError(response.status, body.error.code, body.error.message, body.error.details ?? []);
  }
  return new ApiError(
    response.status,
    "unexpected_response",
    `A API respondeu de um jeito inesperado (HTTP ${response.status}). Tente de novo em instantes.`,
  );
}

type Result = { data?: unknown; error?: unknown; response: Response };

/**
 * Devolve `data` de uma chamada do cliente, ou lança ApiError.
 *   const me = await unwrap(api.GET("/me"));
 */
export async function unwrap<R extends Result>(pending: Promise<R> | R): Promise<NonNullable<R["data"]>> {
  let result: R;
  try {
    result = await pending;
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
    const error = new ApiError(
      0,
      "network_error",
      "Não foi possível falar com a API do HelloSquad. Confira se ela está no ar e tente de novo.",
    );
    (error as Error & { cause?: unknown }).cause = cause;
    throw error;
  }
  if (result.error !== undefined || !result.response.ok) {
    throw toApiError(result.response, result.error);
  }
  return result.data as NonNullable<R["data"]>;
}

export type AccessToken =
  | string
  | null
  | undefined
  | (() => string | null | undefined | Promise<string | null | undefined>);

export type ApiClientOptions = {
  /** Ex.: http://127.0.0.1:8100 no ambiente local. */
  baseUrl: string;
  /** access_token da sessão da Auth (ou função que o devolve). Vai como Authorization: Bearer. */
  accessToken?: AccessToken;
  fetch?: (request: Request) => Promise<Response>;
  headers?: Record<string, string>;
};

/**
 * Cliente tipado pelo contrato (paths do openapi.json). Use com unwrap():
 *   const api = createApiClient({ baseUrl, accessToken: session.access_token });
 *   const me = await unwrap(api.GET("/me"));
 *   const ws = await unwrap(api.POST("/workspaces", { body: { name, slug } }));
 */
export function createApiClient({ baseUrl, accessToken, fetch: customFetch, headers }: ApiClientOptions) {
  const client = createClient<paths>({
    baseUrl,
    headers,
    ...(customFetch ? { fetch: customFetch } : {}),
  });
  client.use({
    async onRequest({ request }) {
      const token = typeof accessToken === "function" ? await accessToken() : accessToken;
      if (token) request.headers.set("Authorization", `Bearer ${token}`);
      return request;
    },
  });
  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;
