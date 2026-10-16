"use server";

import { isApiError, unwrap } from "@hellosquad/contracts";
import { serverApi } from "@/lib/api";
import type { BrandFact, BrandFactHistory, MemoryConflict } from "@/lib/memory";
import { OBJECTIVE_FACT } from "@/lib/onboarding";
import type { ActionResult } from "./actions";

type SuggestionDecision = "confirm" | "correct" | "discard";

function fail(error: unknown): { ok: false; code: string; message: string } {
  if (isApiError(error)) return { ok: false, code: error.code, message: error.message };
  throw error;
}

/**
 * "<Agente> percebeu" (S1d): Confirmar, Corrigir (com o texto novo) ou Descartar. Só o owner decide (a API devolve
 * 403 "Só o dono da conta toma esta decisão."); repetir devolve o estado atual. O fato criado vem junto.
 */
export async function decideSuggestionAction(
  suggestionId: string,
  decision: SuggestionDecision,
  content?: string,
): Promise<ActionResult<{ factId: string | null }>> {
  try {
    const api = await serverApi();
    const decided = await unwrap(
      api.POST("/memory/suggestions/{suggestion_id}/decision", {
        params: { path: { suggestion_id: suggestionId } },
        body: { decision, content: decision === "correct" ? (content ?? null) : null },
      }),
    );
    return { ok: true, data: { factId: decided.resulting_fact_id } };
  } catch (error) {
    return fail(error);
  }
}

/** Corrigir um conhecimento: versão nova, "Confirmado"; a anterior fica no histórico ("Antes: …"). */
export async function correctFactAction(factId: string, content: string): Promise<ActionResult<BrandFact>> {
  try {
    const api = await serverApi();
    const fact = await unwrap(
      api.POST("/memory/facts/{fact_id}/correct", { params: { path: { fact_id: factId } }, body: { content } }),
    );
    return { ok: true, data: fact };
  } catch (error) {
    return fail(error);
  }
}

/** Conflito: "Vale este" (`keepFactId`) ou "Nenhum dos dois: corrigir" (`content`). */
export async function resolveConflictAction(
  conflictId: string,
  choice: { keepFactId: string } | { content: string },
): Promise<ActionResult<MemoryConflict>> {
  try {
    const api = await serverApi();
    const conflict = await unwrap(
      api.POST("/memory/conflicts/{conflict_id}/resolve", {
        params: { path: { conflict_id: conflictId } },
        body: "keepFactId" in choice ? { keep_fact_id: choice.keepFactId } : { content: choice.content },
      }),
    );
    return { ok: true, data: conflict };
  } catch (error) {
    return fail(error);
  }
}

/** Versões de um conhecimento e as sugestões que o originaram (linha aberta: "Alterações" e "Antes: …"). Só leitura. */
export async function factHistoryAction(factId: string): Promise<ActionResult<BrandFactHistory>> {
  try {
    const api = await serverApi();
    const history = await unwrap(api.GET("/memory/facts/{fact_id}/history", { params: { path: { fact_id: factId } } }));
    return { ok: true, data: history };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Objetivo contado ao Nexo no primeiro acesso (V4.6 `_setObjective`, L7928): entra na Memória como declarado por você,
 * já confirmado, pela rota de "Adicionar conhecimento" (S1f; só o owner). Todo o squad passa a usar.
 */
export async function addObjectiveAction(workspaceId: string, content: string): Promise<ActionResult<BrandFact>> {
  try {
    const api = await serverApi();
    const fact = await unwrap(
      api.POST("/workspaces/{workspace_id}/memory/facts", {
        params: { path: { workspace_id: workspaceId } },
        body: { ...OBJECTIVE_FACT, content },
      }),
    );
    return { ok: true, data: fact };
  } catch (error) {
    return fail(error);
  }
}
