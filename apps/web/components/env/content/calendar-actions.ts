"use server";

import { isApiError, unwrap } from "@hellosquad/contracts";
import { serverApi } from "@/lib/api";
import type { CalendarPost } from "./calendar";

export type CalendarRead = { ok: true; items: CalendarPost[] } | { ok: false; code: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Posts do calendário editorial numa janela (S2a: `GET /workspaces/{id}/calendar`, até 92 dias, sem cancelados). Só
 * leitura; a API confere que a pessoa é do workspace. O servidor lê a janela inicial e a tela pede o resto ao navegar.
 */
export async function loadCalendarAction(workspaceId: string, from: string, to: string): Promise<CalendarRead> {
  if (!ISO.test(from) || !ISO.test(to)) return { ok: false, code: "invalid_range" };
  try {
    const api = await serverApi();
    const res = await unwrap(
      api.GET("/workspaces/{workspace_id}/calendar", { params: { path: { workspace_id: workspaceId }, query: { from, to } } }),
    );
    return { ok: true, items: res.items };
  } catch (error) {
    if (isApiError(error)) return { ok: false, code: error.code };
    throw error;
  }
}
