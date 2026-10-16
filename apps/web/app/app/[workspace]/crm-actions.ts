"use server";

import { isApiError, unwrap, type components } from "@hellosquad/contracts";
import { serverApi } from "@/lib/api";
import type { ActionResult } from "./actions";

export type ContactImport = components["schemas"]["ContactImport"];
export type ContactSummary = components["schemas"]["ContactSummary"];
export type ContactImportRequest = components["schemas"]["ContactImportRequest"];

function fail(error: unknown): { ok: false; code: string; message: string } {
  if (isApiError(error)) return { ok: false, code: error.code, message: error.message };
  throw error;
}

/**
 * POST /workspaces/{id}/contacts/imports (S2b): a API lê o CSV em memória, nunca guarda o arquivo e devolve quantas
 * linhas entraram e as recusadas (número e motivo, sem o dado). Só owner ou admin importam (a API confere).
 */
export async function importContactsAction(workspaceId: string, body: ContactImportRequest): Promise<ActionResult<ContactImport>> {
  try {
    const api = await serverApi();
    const result = await unwrap(
      api.POST("/workspaces/{workspace_id}/contacts/imports", { params: { path: { workspace_id: workspaceId } }, body }),
    );
    return { ok: true, data: result };
  } catch (error) {
    return fail(error);
  }
}

/** GET /workspaces/{id}/contacts/summary: total, consentimento por canal, fontes e a última importação. Só leitura. */
export async function loadContactSummaryAction(workspaceId: string): Promise<ActionResult<ContactSummary>> {
  try {
    const api = await serverApi();
    const summary = await unwrap(
      api.GET("/workspaces/{workspace_id}/contacts/summary", { params: { path: { workspace_id: workspaceId } } }),
    );
    return { ok: true, data: summary };
  } catch (error) {
    return fail(error);
  }
}
