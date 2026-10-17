"use server";

import { isApiError, unwrap, type components } from "@hellosquad/contracts";
import { serverApi } from "@/lib/api";

type S = components["schemas"];

/**
 * Resultado de uma ação de escrita do painel: o que a API devolveu, ou o erro dela para o diálogo dizer o que houve
 * (409 com a mensagem do banco, 422 com os campos recusados, 404). Nada é lançado para a tela.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; status: number; fields: string[] };

async function attempt<T>(call: (api: Awaited<ReturnType<typeof serverApi>>) => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await call(await serverApi()) };
  } catch (error) {
    if (!isApiError(error)) throw error;
    const fields = error.details.map((d) => d.field ?? "").filter(Boolean);
    return { ok: false, code: error.code, message: error.message, status: error.status, fields };
  }
}

/* ---------------------------------------------------------------- Contas */

/** "Entrar no ambiente": sessão de suporte só leitura (motivo 10–500, 15/30/60 min). A API avisa o titular por e-mail. */
export async function startSupportSessionAction(
  workspaceId: string,
  input: { reason: string; durationMinutes: 15 | 30 | 60 },
): Promise<ActionResult<S["SupportSession"]>> {
  return attempt((api) =>
    unwrap(
      api.POST("/admin/accounts/{workspace_id}/support-session", {
        params: { path: { workspace_id: workspaceId } },
        body: { reason: input.reason, duration_minutes: input.durationMinutes },
      }),
    ),
  );
}

/** Encerrar a sessão de suporte aberta nesta conta (auditado). */
export async function endSupportSessionAction(workspaceId: string): Promise<ActionResult<S["SupportSession"]>> {
  return attempt((api) =>
    unwrap(api.DELETE("/admin/accounts/{workspace_id}/support-session", { params: { path: { workspace_id: workspaceId } } })),
  );
}

/** Ajuste de crédito com motivo; a chave de idempotência vem do diálogo (gerada ao abrir: clique duplo não lança duas vezes). */
export async function adjustCreditsAction(
  workspaceId: string,
  input: { amount: string; reason: string; idempotencyKey: string },
): Promise<ActionResult<S["CreditAdjustmentResult"]>> {
  return attempt((api) =>
    unwrap(
      api.POST("/admin/accounts/{workspace_id}/credit-adjustments", {
        params: { path: { workspace_id: workspaceId } },
        body: { amount: input.amount, reason: input.reason, idempotency_key: input.idempotencyKey },
      }),
    ),
  );
}

/** Suspender ou reativar a conta, sempre com motivo. */
export async function accountStatusAction(
  workspaceId: string,
  to: "suspend" | "reactivate",
  reason: string,
): Promise<ActionResult<S["AccountStatusResult"]>> {
  const options = { params: { path: { workspace_id: workspaceId } }, body: { reason } };
  return attempt((api) =>
    unwrap(
      to === "suspend"
        ? api.POST("/admin/accounts/{workspace_id}/suspend", options)
        : api.POST("/admin/accounts/{workspace_id}/reactivate", options),
    ),
  );
}

/* ---------------------------------------------------------------- Catálogo, planos e recargas */

/** Preço novo de uma delivery (versão nova; a passada nunca muda). */
export async function catalogPriceAction(
  deliveryType: string,
  input: { credits: string; revisionCredits: string | null; provisional: boolean; approved: boolean; reason: string },
): Promise<ActionResult<S["CatalogPriceVersion"]>> {
  return attempt((api) =>
    unwrap(
      api.PUT("/admin/catalog/{delivery_type}/price", {
        params: { path: { delivery_type: deliveryType } },
        body: {
          credits: input.credits,
          revision_credits: input.revisionCredits,
          provisional: input.provisional,
          approved_commercially: input.approved,
          reason: input.reason,
        },
      }),
    ),
  );
}

/** Estado de homologação de uma delivery. */
export async function catalogHomologationAction(
  deliveryType: string,
  input: { status: S["HomologationUpdate"]["status"]; reason: string },
): Promise<ActionResult<S["CatalogState"]>> {
  return attempt((api) =>
    unwrap(
      api.PUT("/admin/catalog/{delivery_type}/homologation", {
        params: { path: { delivery_type: deliveryType } },
        body: { status: input.status, reason: input.reason },
      }),
    ),
  );
}

/** "À venda": a API recusa (409) e diz o que falta (homologação concluída, preço aprovado e não provisório). */
export async function catalogForSaleAction(
  deliveryType: string,
  input: { forSale: boolean; reason: string },
): Promise<ActionResult<S["CatalogState"]>> {
  return attempt((api) =>
    unwrap(
      api.PUT("/admin/catalog/{delivery_type}/for-sale", {
        params: { path: { delivery_type: deliveryType } },
        body: { for_sale: input.forSale, reason: input.reason },
      }),
    ),
  );
}

/** Versão nova de um plano (a anterior fica como está). */
export async function planVersionAction(slug: string, body: S["PlanVersionUpdate"]): Promise<ActionResult<S["PlanVersionResult"]>> {
  return attempt((api) => unwrap(api.PUT("/admin/plans/{slug}", { params: { path: { slug } }, body })));
}

/** Versão nova de uma recarga avulsa. */
export async function topupVersionAction(slug: string, body: S["TopupVersionUpdate"]): Promise<ActionResult<S["TopupVersionResult"]>> {
  return attempt((api) => unwrap(api.PUT("/admin/topups/{slug}", { params: { path: { slug } }, body })));
}

/* ---------------------------------------------------------------- Fila e pagamentos */

/** Reenfileirar (falhou ou cancelado) ou cancelar (na fila ou esperando aprovação) um run, com motivo. */
export async function runAction(runId: string, to: "requeue" | "cancel", reason: string): Promise<ActionResult<S["RunActionResult"]>> {
  const options = { params: { path: { run_id: runId } }, body: { reason } };
  return attempt((api) =>
    unwrap(to === "requeue" ? api.POST("/admin/queue/runs/{run_id}/requeue", options) : api.POST("/admin/queue/runs/{run_id}/cancel", options)),
  );
}

/** Reprocessar um webhook: consulta a cobrança no provedor e aplica o estado pelo caminho idempotente da cobrança. */
export async function webhookReprocessAction(eventId: string, reason: string): Promise<ActionResult<S["WebhookReprocessResult"]>> {
  return attempt((api) =>
    unwrap(api.POST("/admin/payments/webhooks/{event_id}/reprocess", { params: { path: { event_id: eventId } }, body: { reason } })),
  );
}

/** Marcar a conciliação de um webhook (uma vez; 409 se já marcada). */
export async function webhookReconcileAction(eventId: string, reason: string): Promise<ActionResult<S["ReconciliationResult"]>> {
  return attempt((api) =>
    unwrap(api.POST("/admin/payments/webhooks/{event_id}/reconcile", { params: { path: { event_id: eventId } }, body: { reason } })),
  );
}
