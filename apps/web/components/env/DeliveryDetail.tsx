"use client";

import { Agent, Button, getAgent, Icon, type AgentId } from "@hellosquad/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { decideApprovalAction, type FollowUp } from "@/app/app/[workspace]/actions";
import { useShell } from "@/components/product/shell-context";

export type DeliveryDetailData = {
  workItemId: string;
  conversationId: string | null;
  title: string;
  agent: AgentId;
  envHref: string;
  envLabel: string;
  origin: string;
  typeLabel: string;
  channel: string | null;
  version: { no: number; caption: string; hashtags: string[]; at: string; note: string | null } | null;
  versions: Array<{ no: number; at: string }>;
  approval: {
    id: string;
    status: "pending" | "decided" | "expired";
    decision: string | null;
    followUp?: FollowUp | null;
  } | null;
  brief: Array<{ k: string; v: string }>;
  history: Array<{ agent: AgentId | null; text: string; at: string }>;
};

type Tab = "caption" | "brief" | "history";
type Choice = "approve" | "adjust" | FollowUp;

/** Entrega pontual da V4.6 (detalhe do trabalho): etapas, a entrega à vista, a decisão e Legenda/Briefing/Histórico. */
export function DeliveryDetail({ data, decide = decideApprovalAction }: { data: DeliveryDetailData; decide?: typeof decideApprovalAction }) {
  const t = useTranslations("content.work");
  const tc = useTranslations("common");
  const shell = useShell();
  const member = getAgent(data.agent);
  const [tab, setTab] = useState<Tab>("caption");
  const [busy, setBusy] = useState<Choice | null>(null);
  const [error, setError] = useState(false);
  const decidedBefore = data.approval?.status === "decided";
  const [decision, setDecision] = useState<string | null>(decidedBefore ? (data.approval?.decision ?? null) : null);
  const [followUp, setFollowUp] = useState<FollowUp | null>(decidedBefore ? (data.approval?.followUp ?? null) : null);
  const pending = data.approval?.status === "pending" && !decision;
  const approved = decision === "approved";
  // Pedir ajuste e pedir nova proposta devolvem o trabalho ao agente (run novo); cancelar encerra o trabalho.
  const making = decision === "changes_requested" || (decision === "rejected" && followUp === "revise");
  const cancelled = decision === "rejected" && followUp === "cancel";
  const v = data.version?.no ?? 1;
  const agentRef = `${member.article === "a" ? "a" : "o"} ${member.name}`;

  async function run(kind: Choice) {
    if (!data.approval || busy || !shell.canDecide) return;
    setBusy(kind);
    setError(false);
    const result =
      kind === "approve"
        ? await decide(data.approval.id, "approved")
        : kind === "adjust"
          ? await decide(data.approval.id, "changes_requested")
          : await decide(data.approval.id, "rejected", undefined, kind);
    setBusy(null);
    if (!result.ok) {
      setError(true);
      return;
    }
    setDecision(result.data.decision);
    setFollowUp(result.data.follow_up ?? (kind === "cancel" || kind === "revise" ? kind : null));
    if (kind === "adjust") {
      shell.openConversation({
        conversationId: data.conversationId,
        agent: data.agent,
        context: { kind: "work_item", label: data.title },
      });
    }
  }

  const steps = [
    { k: "done", t: t("prep"), s: data.versions.length > 1 ? t("prepSubAdjusted", { agent: member.name }) : t("prepSub", { agent: member.name }) },
    { k: approved ? "done" : pending && shell.canDecide ? "you" : "todo", t: t("review"), s: approved ? t("reviewDone", { version: v }) : t("reviewSub", { version: v }) },
    { k: "todo", t: t("publish"), s: t("publishSub") },
    { k: "todo", t: t("confirm"), s: t("confirmSub") },
  ];

  return (
    <div className="ps-v is-wide ps-wd" style={{ maxWidth: shell.layout.contentW }}>
      <nav className="ps-crumb">
        <Link className="ps-back" href={data.envHref}>
          <Icon name="left" size={16} strokeWidth={2} />
          <span>{data.envLabel}</span>
        </Link>
        <span className="ps-crumb-s">/</span>
        <span>{data.title}</span>
      </nav>
      <header className="ps-wdh">
        <div className="ps-wdh-t">
          <div className="ps-meta">
            <span className="hs-tag hs-tag--auto">{t("tag")}</span>
            <span>{data.origin}</span>
          </div>
          <h1 className="ps-h1">{data.title}</h1>
        </div>
        <div className="ps-wdh-a">
          <Button
            variant="soft"
            size="s"
            icon={null}
            onClick={() => shell.openConversation({ conversationId: data.conversationId, agent: data.agent, context: { kind: "work_item", label: data.title } })}
          >
            {t("talk", { name: `${member.article === "a" ? "a" : "o"} ${member.name}` })}
          </Button>
        </div>
      </header>
      <ol className="ps-life" aria-label={t("steps")}>
        {steps.map((s, i) => (
          <li key={s.t} className={`ps-step is-${s.k}`}>
            <span className="ps-step-n">{s.k === "done" ? <Icon name="check" size={14} strokeWidth={2.4} /> : String(i + 1)}</span>
            <span className="ps-step-t">
              <b>{s.t}</b>
              <small>{s.s}</small>
            </span>
          </li>
        ))}
      </ol>
      <div className="ps-wdg">
        <div className="ps-mesa">
          {data.version ? (
            <div className="ps-frame ps-capf">
              <div className="ps-who">
                <Agent agent={data.agent} size={22} />
                <b>{member.name}</b>
                <span>{t("captionBy")}</span>
              </div>
              <p className="ps-caption">{data.version.caption}</p>
              {data.version.hashtags.length ? <p className="ps-caption ps-tags">{data.version.hashtags.join(" ")}</p> : null}
            </div>
          ) : null}
          {data.versions.length ? (
            <div className="ps-vers" role="group" aria-label={t("versions")}>
              {data.versions.map((x) => (
                <button key={x.no} type="button" className={`ps-ver${x.no === v ? " is-on" : ""}`}>
                  <span>v{x.no}</span>
                  <i>{x.at}</i>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <aside className="ps-side2">
          {pending ? (
            <div className="ps-dec">
              <div className="ps-dec-h">
                <span className="ps-dec-av">
                  <Agent agent={data.agent} size={40} expression="big" />
                </span>
                <div>
                  <b>{shell.canDecide ? t("waits", { agent: member.name }) : t("waitsDecision", { agent: member.name })}</b>
                  {shell.canDecide || data.version?.note ? <p>{data.version?.note || t("waitsText", { version: v })}</p> : null}
                </div>
              </div>
              <dl className="ps-facts">
                <div>
                  <dt>{t("facts.format")}</dt>
                  <dd>{data.typeLabel}</dd>
                </div>
                {data.channel ? (
                  <div>
                    <dt>{t("facts.channel")}</dt>
                    <dd>{data.channel}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>{t("facts.publication")}</dt>
                  <dd>{t("facts.notIncluded")}</dd>
                </div>
              </dl>
              {shell.canDecide ? (
                <>
                  <div className="ps-dec-a">
                    <Button variant="primary" size="s" icon="check" state={busy === "approve" ? "loading" : "rest"} loadingLabel={t("approving")} onClick={() => run("approve")}>
                      {t("approve", { version: v })}
                    </Button>
                    <Button variant="soft" size="s" icon={null} state={busy === "adjust" ? "loading" : "rest"} onClick={() => run("adjust")}>
                      {t("adjust")}
                    </Button>
                    <Button variant="soft" size="s" icon={null} state={busy === "revise" ? "loading" : "rest"} onClick={() => run("revise")}>
                      {t("newProposal")}
                    </Button>
                    <Button variant="soft" size="s" icon={null} state={busy === "cancel" ? "loading" : "rest"} onClick={() => run("cancel")}>
                      {t("cancelWork")}
                    </Button>
                  </div>
                  <p className="ps-dec-n" role={error ? "alert" : undefined}>
                    {error ? t("decideError") : t("adjustNote", { agent: agentRef })}
                  </p>
                </>
              ) : (
                <p className="ps-dec-n">{tc("ownerDecides")}</p>
              )}
            </div>
          ) : approved ? (
            <div className="ps-dec is-ok">
              <div className="ps-dec-h">
                <span className="ps-dec-av">
                  <Agent agent={data.agent} size={40} expression="happy" />
                </span>
                <div>
                  <b>{t("approved")}</b>
                  <p>{t("approvedText")}</p>
                </div>
              </div>
            </div>
          ) : making ? (
            <div className="ps-dec is-wait">
              <div className="ps-dec-h">
                <span className="ps-dec-av">
                  <Agent agent={data.agent} size={40} thinking />
                </span>
                <div>
                  <b>{decision === "changes_requested" ? t("makingAdjust", { agent: member.name, version: v }) : t("makingRevise", { agent: member.name })}</b>
                  <p>{t("makingText")}</p>
                </div>
              </div>
            </div>
          ) : cancelled ? (
            <div className="ps-dec">
              <div className="ps-dec-h">
                <span className="ps-dec-av">
                  <Agent agent={data.agent} size={40} />
                </span>
                <div>
                  <b>{t("cancelled")}</b>
                  <p>{t("cancelledText", { agent: member.name })}</p>
                </div>
              </div>
            </div>
          ) : null}
          <div className="ps-tabs" role="tablist">
            {(["caption", "brief", "history"] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={`ps-tab${tab === k ? " is-on" : ""}`} onClick={() => setTab(k)}>
                {t(`tabs.${k}`)}
              </button>
            ))}
          </div>
          {tab === "caption" && data.version ? (
            <div className="ps-tabc">
              <div className="ps-who">
                <Agent agent={data.agent} size={22} />
                <b>{member.name}</b>
                <span>{t("captionBy")}</span>
              </div>
              <p className="ps-caption">{data.version.caption}</p>
            </div>
          ) : null}
          {tab === "brief" ? (
            <div className="ps-tabc">
              <dl className="ps-kv">
                {data.brief.map((b) => (
                  <div key={b.k}>
                    <dt>{b.k}</dt>
                    <dd>{b.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
          {tab === "history" ? (
            <div className="ps-tabc">
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
          ) : null}
        </aside>
      </div>
    </div>
  );
}
