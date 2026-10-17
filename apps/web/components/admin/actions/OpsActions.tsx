"use client";

import { useTranslations } from "next-intl";
import { runAction, webhookReconcileAction, webhookReprocessAction } from "@/app/admin/(painel)/acoes";
import { ActionDialog } from "./ActionDialog";

/** Estados em que a API aceita cada ação do run (SA6a): reenfileirar o que falhou ou foi cancelado; cancelar o que espera. */
export const REQUEUE_FROM = ["failed", "cancelled"] as const;
export const CANCEL_FROM = ["queued", "waiting_approval"] as const;

/**
 * "Reenfileirar" e "Cancelar" de um run (SA0 `fila.js`), sempre com motivo. Só aparece a ação que o estado aceita; se a
 * API recusar (409, por exemplo "já reservou créditos"), o motivo da recusa fica no diálogo.
 */
export function RunActions(props: { runId: string; status: string; work: string | null; account: string }) {
  const t = useTranslations("admin.acoes.run");
  const short = props.runId.slice(0, 8);
  const what = props.work ? `${props.work} · ${props.account}` : props.account;
  const requeue = (REQUEUE_FROM as readonly string[]).includes(props.status);
  const cancel = (CANCEL_FROM as readonly string[]).includes(props.status);
  if (!requeue && !cancel) return null;
  return (
    <div className="hl-acts">
      {requeue ? (
        <ActionDialog
          label={t("requeue.open")}
          variant="soft"
          title={t("requeue.title", { id: short })}
          desc={t("requeue.desc", { what })}
          confirmLabel={t("requeue.confirm")}
          submit={(reason) => runAction(props.runId, "requeue", reason)}
          done={(r) => t("requeue.done", { id: short, attempts: r.attempts })}
        />
      ) : null}
      {cancel ? (
        <ActionDialog
          label={t("cancel.open")}
          variant="ghost"
          title={t("cancel.title", { id: short })}
          desc={t("cancel.desc", { what })}
          confirmLabel={t("cancel.confirm")}
          reasonHint={t("cancel.reasonHint")}
          submit={(reason) => runAction(props.runId, "cancel", reason)}
          done={() => t("cancel.done", { id: short })}
        />
      ) : null}
    </div>
  );
}

/**
 * "Reprocessar" e "Marcar conciliação" de um webhook (SA0 `pagamentos.js`; API da SA6a), com motivo. O resultado do
 * reprocessamento diz o que houve: aplicado, sem mudança, duplicado (mesmo id: nada se repete) ou provedor sem estado.
 */
export function WebhookActions(props: { eventId: string; event: string; reconciled: boolean }) {
  const t = useTranslations("admin.acoes.webhook");
  return (
    <div className="hl-acts">
      <ActionDialog
        label={t("reprocess.open")}
        variant="soft"
        title={t("reprocess.title", { event: props.event })}
        desc={t("reprocess.desc")}
        confirmLabel={t("reprocess.confirm")}
        submit={(reason) => webhookReprocessAction(props.eventId, reason)}
        done={(r) => {
          const status = r.provider_status ?? "—";
          if (r.duplicate) return t("reprocess.duplicate", { status });
          if (r.outcome === "applied") return t("reprocess.applied", { status });
          if (r.outcome === "no_change") return t("reprocess.noChange", { status });
          if (r.outcome === "provider_unknown") return t("reprocess.unknown");
          return t("reprocess.other", { outcome: r.outcome, status });
        }}
      />
      {props.reconciled ? null : (
        <ActionDialog
          label={t("reconcile.open")}
          variant="ghost"
          title={t("reconcile.title", { event: props.event })}
          desc={t("reconcile.desc")}
          confirmLabel={t("reconcile.confirm")}
          submit={(reason) => webhookReconcileAction(props.eventId, reason)}
          done={() => t("reconcile.done", { event: props.event })}
        />
      )}
    </div>
  );
}
