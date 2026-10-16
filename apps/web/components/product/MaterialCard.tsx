"use client";

import { isAgentId } from "@hellosquad/ui";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { decideApprovalAction, deliveryCardAction, type DeliveryCard } from "@/app/app/[workspace]/actions";
import { useLive } from "./live";
import { useShell, type ConversationTarget } from "./shell-context";

export type MaterialCardActions = { card: typeof deliveryCardAction; decide: typeof decideApprovalAction };

export const MATERIAL_CARD_ACTIONS: MaterialCardActions = { card: deliveryCardAction, decide: decideApprovalAction };

/**
 * Cartão "Material · vN" na mensagem do agente que entregou uma versão (V4.6 L5539, `isMat`; dados em L8611):
 * miniatura que abre o trabalho, "Material · vN", o título, o estado da versão e, enquanto ela aguarda a decisão
 * do dono, "Aprovar vN" e "Pedir ajuste". O estado se relê a cada novidade do canal (decisão, versão nova).
 * A entrega da Fase 1 é texto: a miniatura mostra o começo da legenda (a V4.6 só desenha peça visual). No projeto
 * coordenado (A2d), o título é a etapa que entregou ("Etapa 1 · Estratégia") e o cartão abre o projeto.
 */
export function MaterialCard({
  runId,
  versionId,
  target,
  actions = MATERIAL_CARD_ACTIONS,
}: {
  runId: string;
  versionId: string;
  /** Conversa em que o cartão está: "Pedir ajuste" escreve nela. */
  target: ConversationTarget;
  actions?: MaterialCardActions;
}) {
  const t = useTranslations("conversation.card");
  const tw = useTranslations("content.work");
  const shell = useShell();
  const live = useLive();
  const router = useRouter();
  const [card, setCard] = useState<DeliveryCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const tick = live.state.version;

  useEffect(() => {
    let alive = true;
    actions.card(runId, versionId).then((result) => {
      if (alive && result.ok) setCard(result.data);
    });
    return () => {
      alive = false;
    };
  }, [runId, versionId, tick, actions]);

  if (!card) return null;
  const agent = isAgentId(card.agentId) ? card.agentId : null;
  const href = agent ? `/app/${shell.workspace.slug}/squad/${agent}/trabalho/${card.workItemId}` : null;
  const live_ = card.state === "review" && !!card.approvalId && shell.canDecide;
  const stateL =
    card.state === "superseded" ? t("state.superseded", { next: card.versionNo + 1 }) : t(`state.${card.state}`);

  async function approve() {
    if (!card?.approvalId || busy) return;
    setBusy(true);
    setError(false);
    const result = await actions.decide(card.approvalId, "approved");
    setBusy(false);
    if (!result.ok) {
      setError(true);
      return;
    }
    setCard({ ...card, state: "approved", approvalId: null });
    router.refresh();
  }

  // Como no protótipo (`_postAdjAsk`) e na diretriz de 16/10 10:20: o campo recebe "Quero pedir um ajuste nesta
  // versão." e o envio registra o pedido de ajuste com a nota.
  function adjust() {
    if (!card?.approvalId) return;
    shell.openConversation({
      ...target,
      draft: tw("adjustDraft"),
      adjust: { approvalId: card.approvalId, workItemId: card.workItemId, version: card.versionNo },
    });
  }

  return (
    <div className="ps-card ps-mat">
      <button
        type="button"
        className="ps-thumb"
        aria-label={t("open", { version: card.versionNo, title: card.step ? t("stepTitle", { seq: card.step.seq, title: card.step.title }) : card.title })}
        onClick={() => href && router.push(href)}
      >
        <span className="ps-capm">{card.excerpt}</span>
      </button>
      <div className="ps-mat-b">
        <div className="ps-mat-k">
          <span className="ps-card-k">{t("material", { version: card.versionNo })}</span>
        </div>
        <b className="ps-mat-t">{card.step ? t("stepTitle", { seq: card.step.seq, title: card.step.title }) : card.title}</b>
        <small className="ps-mat-s">{stateL}</small>
        {live_ ? (
          <div className="ps-mat-a">
            <button type="button" className="ps-mini is-pri" onClick={approve} disabled={busy}>
              {tw("approve", { version: card.versionNo })}
            </button>
            <button type="button" className="ps-mini" onClick={adjust} disabled={busy}>
              {tw("adjust")}
            </button>
          </div>
        ) : null}
        {error ? <small className="ps-mat-s" role="alert">{t("error")}</small> : null}
      </div>
    </div>
  );
}
