import { isApiError, unwrap, type ApiError, type components } from "@hellosquad/contracts";
import { redirect } from "next/navigation";
import { cache } from "react";
import { serverApi } from "./api";

type S = components["schemas"];
export type AdminMe = S["AdminMe"];
export type AccountPage = S["AccountPage"];
export type AccountSummary = S["AccountSummary"];
export type AccountDetail = S["AccountDetail"];
export type CatalogItem = S["CatalogItem"];
export type PlansResponse = S["PlansResponse"];
export type PaymentsOverview = S["PaymentsOverview"];
export type ProvidersResponse = S["ProvidersResponse"];
export type AuditPage = S["AuditPage"];
export type AuditItem = S["AuditItem"];
export type QueueOverview = S["QueueOverview"];
export type QueueRun = S["QueueRun"];
export type RunDetail = S["RunDetail"];
export type ModelsOverview = S["ModelsOverview"];
export type ConsumptionResponse = S["ConsumptionResponse"];

/** Resposta de uma leitura do painel: o dado, ou o erro da API para a tela dizer o que houve (nunca dado inventado). */
export type AdminResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

const SESSION_GONE = new Set(["not_authenticated", "invalid_token"]);

/** Leitura do painel pela nossa API (`/admin/*`); sessão recusada volta para o login com o painel como destino. */
export async function adminRead<T>(read: (api: Awaited<ReturnType<typeof serverApi>>) => Promise<T>, back = "/admin") {
  let result: AdminResult<T>;
  try {
    result = { ok: true, data: await read(await serverApi()) };
  } catch (error) {
    if (!isApiError(error)) throw error;
    result = { ok: false, error };
  }
  if (!result.ok && (result.error.status === 401 || SESSION_GONE.has(result.error.code))) {
    redirect(`/entrar?${new URLSearchParams({ sessao: "expirada", next: back })}`);
  }
  return result;
}

/** `GET /admin/me` uma vez por requisição: quem é o Super Admin e se a 2FA já é exigida (faixa de aviso). */
export const loadAdminMe = cache(async (): Promise<AdminResult<AdminMe>> =>
  adminRead((api) => unwrap(api.GET("/admin/me"))),
);

/** O 403 que a API devolve a quem não é Super Admin (`platform_admin_only`). */
export function isForbidden(error: ApiError): boolean {
  return error.status === 403 || error.code === "platform_admin_only";
}
