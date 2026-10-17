"use server";

import { isApiError, unwrap } from "@hellosquad/contracts";
import { serverApi } from "@/lib/api";
import type { ProviderHealthItem } from "@/lib/admin";

/** Resultado do "Informar saldo": o provedor atualizado, ou o erro da API com os campos recusados (422 `details`). */
export type BalanceResult =
  | { ok: true; data: ProviderHealthItem }
  | { ok: false; code: string; message: string; status: number; fields: string[] };

/**
 * Saldo lido no painel do provedor → `PATCH /admin/providers/{provider}/balance` (valor, moeda, quando foi lido, motivo
 * e, se vier, o limiar do alerta). A API grava o histórico e a auditoria; nada muda sozinho por causa do alerta.
 */
export async function reportBalanceAction(
  provider: string,
  input: { amount: string; currency: string; readAt: string; reason: string; alertBelow: string | null },
): Promise<BalanceResult> {
  try {
    const api = await serverApi();
    const data = await unwrap(
      api.PATCH("/admin/providers/{provider}/balance", {
        params: { path: { provider } },
        body: {
          amount: input.amount,
          currency: input.currency,
          read_at: input.readAt,
          reason: input.reason,
          ...(input.alertBelow === null ? {} : { alert_below: input.alertBelow }),
        },
      }),
    );
    return { ok: true, data };
  } catch (error) {
    if (!isApiError(error)) throw error;
    const fields = error.details.map((d) => d.field ?? "").filter(Boolean);
    return { ok: false, code: error.code, message: error.message, status: error.status, fields };
  }
}
