"use client";

import { Agent, getAgent, Icon, PRODUCT_ICONS, type AgentId } from "@hellosquad/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { decideApprovalAction, type FollowUp } from "@/app/app/[workspace]/actions";
import { StatusGlyph } from "@/components/env/projects/StatusGlyph";
import { useShell } from "@/components/product/shell-context";
import type { DeliveryType } from "@/lib/delivery-types";
import { DocumentBody } from "./DocumentBody";

export type DocumentVersion = {
  no: number;
  at: string;
  status: "draft" | "approved" | "superseded";
  note: string | null;
  content: Record<string, unknown>;
};

export type DocumentDetailData = {
  workItemId: string;
  conversationId: string | null;
  title: string;
  agent: AgentId;
  envHref: string;
  envLabel: string;
  origin: string;
  type: DeliveryType;
  /** Nome da entrega no catálogo ("Diagnóstico", "Calendário editorial"…): o selo do topo do documento. */
  typeLabel: string;
  /** Rótulo do botão de aprovar (V4.4 L12604: "Aprovar o diagnóstico", "Aprovar o direcionamento"; nas outras, "Aprovar vN"). */
  approveLabel: string;
  /** Da primeira à mais recente. */
  versions: DocumentVersion[];
  approval: { id: string; status: "pending" | "decided" | "expired"; decision: string | null; followUp?: FollowUp | null } | null;
  history: Array<{ agent: AgentId | null; text: string; at: string }>;
  team?: { agents: AgentId[]; label: string };
  project?: { name: string; href: string } | null;
};

type Choice = "approve" | "adjust" | FollowUp;

/**
 * Documento revisável da A2b, na leitura editorial do "Documento da Bia" da V4.4 (template L5069): o documento à
 * esquerda (`bd-doc`, seções da entrega) e, ao lado, o estado com a decisão, as versões, conversar e o histórico.
 * Vale para todas as entregas em documento (Bia, Otto, Kiwi, Max e Íris). A decisão é a da S1f (só o owner decide):
 * aprovar, pedir ajuste pela conversa, pedir nova proposta ou cancelar o trabalho (dono, 16/10 08:55).
 */
export function DocumentDetail({
  data,
  decide = decideApprovalAction,
}: {
  data: DocumentDetailData;
  decide?: typeof decideApprovalAction;
}) {
  const t = useTranslations("content.work");
  const td = useTranslations("docs");
  const tc = useTranslations("common");
  const shell = useShell();
  const member = getAgent(data.agent);
  const latest = data.versions[data.versions.length - 1] ?? null;
  const [seen, setSeen] = useState<number | null>(latest?.no ?? null);
  const [busy, setBusy] = useState<Choice | null>(null);
  const [error, setError] = useState(false);
  const decidedBefore = data.approval?.status === "decided";
  const [decision, setDecision] = useState<string | null>(decidedBefore ? (data.approval?.decision ?? null) : null);
  const [followUp, setFollowUp] = useState<FollowUp | null>(decidedBefore ? (data.approval?.followUp ?? null) : null);
  const pending = data.approval?.status === "pending" && !decision;
  const approved = decision === "approved" || latest?.status === "approved";
  const making = decision === "changes_requested" || (decision === "rejected" && followUp === "revise");
  const cancelled = decision === "rejected" && followUp === "cancel";
  const v = latest?.no ?? 1;
  const shown = data.versions.find((x) => x.no === seen) ?? latest;
  const older = !!shown && !!latest && shown.no !== latest.no;

  async function run(kind: Choice) {
    if (!data.approval || busy || !shell.canDecide) return;
    if (kind === "adjust") {
      // "Pedir ajuste" (dono, 16/10 10:20): a conversa do trabalho abre com o texto do protótipo no campo; o envio
      // é que registra `changes_requested` com a nota.
      shell.openConversation({
        conversationId: shell.workConversations[data.workItemId] ?? data.conversationId,
        agent: data.agent,
        context: { kind: "work_item", label: data.title, origin: data.origin },
        draft: t("adjustDraft"),
        adjust: { approvalId: data.approval.id, workItemId: data.workItemId, version: v },
      });
      return;
    }
    setBusy(kind);
    setError(false);
    const result =
      kind === "approve" ? await decide(data.approval.id, "approved") : await decide(data.approval.id, "rejected", undefined, kind);
    setBusy(null);
    if (!result.ok) {
      setError(true);
      return;
    }
    setDecision(result.data.decision);
    setFollowUp(result.data.follow_up ?? (kind === "cancel" || kind === "revise" ? kind : null));
  }

  const family = pending ? "you" : approved ? "done" : cancelled ? "done" : "and";
  const stateLabel = pending
    ? tc("states.needs_you")
    : approved
      ? t("approved")
      : making
        ? decision === "changes_requested"
          ? t("makingAdjust", { agent: member.name, version: v })
          : t("makingRevise", { agent: member.name })
        : cancelled
          ? t("cancelled")
          : tc("states.in_progress");
  const note = pending
    ? shell.canDecide
      ? latest?.note || t("waitsText", { version: v })
      : t("waitsDecision", { agent: member.name })
    : approved
      ? t("approvedText")
      : making
        ? t("makingText")
        : cancelled
          ? t("cancelledText", { agent: member.name })
          : "";
  const talk = () =>
    shell.openConversation({
      conversationId: shell.workConversations[data.workItemId] ?? data.conversationId,
      agent: data.agent,
      context: { kind: "work_item", label: data.title, origin: data.origin },
    });
  const docTitle = (typeof shown?.content.titulo === "string" && shown.content.titulo) || data.title;

  return (
    <div className="ps-v is-wide bd" style={{ maxWidth: shell.layout.contentW }}>
      <nav className="ps-crumb">
        <Link className="ps-back" href={data.envHref}>
          <Icon name="left" size={16} strokeWidth={2} />
          <span>{data.envLabel}</span>
        </Link>
        <span className="ps-crumb-s">/</span>
        <span>{data.title}</span>
      </nav>
      <div className="bd-g">
        <article className="bd-doc" aria-labelledby="bd-title">
          <header className="bd-h">
            <span className="bd-k">{data.typeLabel}</span>
            <h1 id="bd-title">{docTitle}</h1>
            <p className="bd-meta">
              {[td("docBy", { article: member.article, name: member.name }), shown ? `v${shown.no} · ${shown.at}` : null, data.origin]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {data.project ? (
              <Link className="ps-pjl" href={data.project.href}>
                <svg className="ps-ic" viewBox="0 0 18 18" aria-hidden="true">
                  <path d={PRODUCT_ICONS.folder} />
                </svg>
                <span>{data.project.name}</span>
              </Link>
            ) : null}
          </header>
          {older && shown ? <p className="bd-note">{td("viewingOld", { version: shown.no })}</p> : null}
          {shown ? (
            <DocumentBody type={data.type} content={shown.content} business={shell.workspace.name} />
          ) : (
            <p className="bd-note">{td("empty")}</p>
          )}
        </article>
        <aside className="bd-side" aria-label={t("steps")}>
          <div className="bd-card">
            <span className={`wk-st is-${family}`}>
              <StatusGlyph family={family} />
              <span>{stateLabel}</span>
            </span>
            {note ? <p className="bd-ap">{note}</p> : null}
            {pending && shell.canDecide ? (
              <>
                <div className="bd-ab">
                  <button type="button" className="hm-btn is-dark is-s" disabled={!!busy} aria-busy={busy === "approve" || undefined} onClick={() => run("approve")}>
                    <span>{busy === "approve" ? t("approving") : data.approveLabel}</span>
                  </button>
                  <button type="button" className="hm-btn is-soft is-s" disabled={!!busy} onClick={() => run("adjust")}>
                    <span>{t("adjust")}</span>
                  </button>
                </div>
                <div className="bd-ab">
                  <button type="button" className="hm-link is-s" disabled={!!busy} onClick={() => run("revise")}>
                    <span>{t("newProposal")}</span>
                  </button>
                  <button type="button" className="hm-link is-s" disabled={!!busy} onClick={() => run("cancel")}>
                    <span>{t("cancelWork")}</span>
                  </button>
                </div>
                <p className="bd-ap" role={error ? "alert" : undefined}>
                  {error ? t("decideError") : t("adjustNote", { article: member.article, agent: member.name })}
                </p>
              </>
            ) : pending ? (
              <p className="bd-ap">{tc("ownerDecides")}</p>
            ) : null}
          </div>
          {data.versions.length ? (
            <div className="bd-card">
              <h3 className="bd-ck">{t("versions")}</h3>
              {[...data.versions].reverse().map((x) => (
                <button
                  key={x.no}
                  type="button"
                  className={`bd-v${x.no === shown?.no ? " is-on" : ""}`}
                  aria-pressed={x.no === shown?.no}
                  onClick={() => setSeen(x.no)}
                >
                  <b>v{x.no}</b>
                  <small>{x.at}</small>
                </button>
              ))}
            </div>
          ) : null}
          <div className="bd-card bd-acts">
            <button type="button" className="hm-btn is-soft is-s" onClick={talk}>
              <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                <path d={PRODUCT_ICONS.ask} />
              </svg>
              <span>{t("talk", { article: member.article, name: member.name })}</span>
            </button>
            <button type="button" className="hm-link" onClick={() => shell.toast(tc("unavailable"), data.agent)}>
              <svg className="ps-ic" viewBox="0 0 18 18" aria-hidden="true">
                <path d={PRODUCT_ICONS.file} />
              </svg>
              <span>{td("pdf")}</span>
            </button>
          </div>
          {data.team?.agents.length ? (
            <div className="bd-card">
              <span className="hs-stack">
                <span className="hs-stack-av">
                  {data.team.agents.map((a) => (
                    <Agent key={a} agent={a} size={24} outline />
                  ))}
                </span>
                <span>{data.team.label}</span>
              </span>
            </div>
          ) : null}
          <div className="bd-card">
            <h3 className="bd-ck">{t("tabs.history")}</h3>
            <div className="ps-hist">
              {data.history.map((h, i) => (
                <div className="ps-hi" key={i}>
                  {h.agent ? <Agent agent={h.agent} size={20} /> : <span className="ps-you">{shell.workspace.name[0]}</span>}
                  <span className="ps-hi-t">{h.text}</span>
                  <span className="ps-time">{h.at}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
