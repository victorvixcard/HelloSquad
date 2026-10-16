"use client";

import { Agent, Button, getAgent, Icon, PRODUCT_ICONS, type AgentId } from "@hellosquad/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type CSSProperties } from "react";
import { decideApprovalAction, type FollowUp } from "@/app/app/[workspace]/actions";
import { useShell } from "@/components/product/shell-context";

export type StepStatus = "pending" | "in_progress" | "needs_you" | "waiting_engine" | "blocked" | "done" | "failed" | "skipped";

export type CoordinatedStep = {
  seq: number;
  title: string;
  agent: AgentId;
  status: StepStatus;
  /** Responsabilidade que o Nexo deu ao especialista ("estratégia e conceito"). */
  responsibility: string | null;
  /** Motivo do estado, já no idioma (catálogo do backend): "Aguardando o motor de imagem". */
  reason: string | null;
  /** Etapas de que esta depende (seq). */
  dependsOn: number[];
  /** Versão que a etapa entregou ou que a fechou. */
  version: { no: number; excerpt: string } | null;
  /** Pendência desta etapa (só a etapa que espera a decisão do dono tem). */
  approvalId: string | null;
  /** A etapa já teve uma decisão sua (aprovada por você). */
  approved: boolean;
};

export type CoordinatedWorkData = {
  workItemId: string;
  conversationId: string | null;
  /** A conversa do pedido é a Sala do Squad (senão, a conversa com o Nexo). */
  room: boolean;
  name: string;
  goal: string | null;
  origin: string;
  envHref: string;
  envLabel: string;
  steps: CoordinatedStep[];
  history: Array<{ agent: AgentId | null; text: string; at: string }>;
  /** O trabalho foi cancelado por você (as etapas abertas ficam "não feitas", S2d). */
  cancelled?: boolean;
};

type Tab = "deliveries" | "decisions" | "squad" | "history";
const TABS: readonly Tab[] = ["deliveries", "decisions", "squad", "history"];

/** Família da etapa no desenho da V4.6 (`ps-stg is-done|now|todo`): só "agora" ganha barra, e indeterminada (L13957). */
function stageClass(s: StepStatus): "done" | "now" | "todo" {
  if (s === "done") return "done";
  if (s === "in_progress" || s === "needs_you") return "now";
  return "todo";
}

/**
 * Projeto coordenado (V4.6 "Campanha de Natal", L5031–5066 e L9197–9241; S2d): o trabalho do Nexo com uma etapa por
 * especialista. Cabeçalho com "projeto coordenado", a origem, o objetivo, a equipe e a conversa; uma faixa por etapa
 * com o responsável e o estado (sem progresso inventado: só a etapa em curso tem barra, indeterminada); abas
 * "Entregas", "Decisões", "Squad" e "Histórico"; ao lado, a próxima decisão e o combinado. A decisão aparece só na
 * etapa que espera a pessoa; a etapa da Kaia sem motor fica "aguardando o motor de imagem", sem botão de gerar.
 */
export function CoordinatedWork({ data, decide = decideApprovalAction }: { data: CoordinatedWorkData; decide?: typeof decideApprovalAction }) {
  const t = useTranslations("projects.coord");
  const tw = useTranslations("content.work");
  const tc = useTranslations("common");
  const shell = useShell();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("deliveries");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const cap = (text: string) => (text ? text.charAt(0).toLocaleUpperCase() + text.slice(1) : text);
  const who = (a: AgentId) => ({ article: getAgent(a).article, name: getAgent(a).name });
  const agents: AgentId[] = ["nexo", ...data.steps.map((s) => s.agent).filter((a, i, all) => a !== "nexo" && all.indexOf(a) === i)];
  const conversation = {
    conversationId: shell.workConversations[data.workItemId] ?? data.conversationId,
    agent: data.room ? null : ("nexo" as const),
    room: data.room,
    context: data.room ? undefined : { kind: "work_item" as const, label: data.name, origin: data.origin },
  };
  const titleOf = (seq: number) => data.steps.find((s) => s.seq === seq)?.title ?? String(seq);

  const stepState = (s: CoordinatedStep): string => {
    switch (s.status) {
      case "pending":
        return s.responsibility ? cap(s.responsibility) : t("step.pending");
      case "in_progress":
        return t("step.in_progress", { name: getAgent(s.agent).name });
      case "needs_you":
        return t("step.needs_you", { version: s.version?.no ?? 1 });
      case "done":
        return s.version ? t("step.doneVersion", { version: s.version.no }) : t("step.done");
      case "waiting_engine":
        return s.reason ?? t("step.waiting_engine");
      case "blocked":
        return s.reason ?? t("step.blocked");
      case "failed":
        return t("step.failed");
      case "skipped":
        return t("step.skipped");
    }
  };

  // Aprovar, pedir nova proposta ou cancelar o trabalho (decisão do dono de 16/10 08:55: rejeitar tem as duas saídas).
  async function run(s: CoordinatedStep, kind: "approve" | FollowUp) {
    if (!s.approvalId || busy || !shell.canDecide) return;
    setBusy(`${s.approvalId}:${kind}`);
    setError(false);
    const result = kind === "approve" ? await decide(s.approvalId, "approved") : await decide(s.approvalId, "rejected", undefined, kind);
    setBusy(null);
    if (!result.ok) {
      setError(true);
      return;
    }
    router.refresh();
  }

  // Como no protótipo (`_postAdjAsk`) e na decisão do dono de 16/10 10:20: a conversa do pedido abre com
  // "Quero pedir um ajuste nesta versão." no campo; o envio registra o ajuste e a etapa volta ao mesmo especialista.
  function adjust(s: CoordinatedStep) {
    if (!s.approvalId || !shell.canDecide) return;
    shell.openConversation({
      ...conversation,
      draft: tw("adjustDraft"),
      adjust: { approvalId: s.approvalId, workItemId: data.workItemId, version: s.version?.no ?? 1 },
    });
  }

  const waiting = data.steps.find((s) => s.status === "needs_you" && s.approvalId);
  const running = data.steps.find((s) => s.status === "in_progress");
  const allDone = data.steps.length > 0 && data.steps.every((s) => s.status === "done" || s.status === "waiting_engine" || s.status === "skipped");
  const next = data.cancelled
    ? { agent: "nexo" as AgentId, t: tw("cancelled"), s: tw("cancelledText", { agent: getAgent("nexo").name }) }
    : waiting
    ? { agent: waiting.agent, t: t("next.approve", { step: waiting.title }), s: t("next.approveSub", { version: waiting.version?.no ?? 1 }) }
    : running
      ? { agent: running.agent, t: t("next.none"), s: t("next.working", { name: getAgent(running.agent).name, step: running.title }) }
      : allDone
        ? { agent: "nexo" as AgentId, t: t("next.none"), s: t("next.closed") }
        : { agent: "nexo" as AgentId, t: t("next.none"), s: t("next.wait") };

  return (
    <div className="ps-v is-wide ps-wd" style={{ maxWidth: shell.layout.contentW }}>
      <nav className="ps-crumb">
        <Link className="ps-back" href={data.envHref}>
          <Icon name="left" size={16} strokeWidth={2} />
          <span>{data.envLabel}</span>
        </Link>
        <span className="ps-crumb-s">/</span>
        <span>{data.name}</span>
      </nav>
      <header className="ps-wdh">
        <div className="ps-wdh-t">
          <div className="ps-meta">
            <span className="hs-tag hs-tag--auto">{t("tag")}</span>
            <span>{data.origin}</span>
          </div>
          <h1 className="ps-h1">{data.name}</h1>
          {data.goal ? <p className="ps-sub">{data.goal}</p> : null}
        </div>
        <div className="ps-wdh-a">
          <span className="hs-stack">
            <span className="hs-stack-av">
              {agents.map((a) => (
                <Agent key={a} agent={a} size={24} outline />
              ))}
            </span>
            <span>{t("stack", { lead: getAgent("nexo").name, count: agents.length - 1 })}</span>
          </span>
          <Button variant="soft" size="s" icon={null} onClick={() => shell.openConversation(conversation)}>
            {data.room ? t("talkRoom") : tw("talk", { article: getAgent("nexo").article, name: getAgent("nexo").name })}
          </Button>
        </div>
      </header>
      <ol className="ps-stgs" aria-label={t("stages")}>
        {data.steps.map((s) => {
          const k = stageClass(s.status);
          const style = { background: getAgent(s.agent).color, width: k === "todo" ? "0%" : "100%" } as CSSProperties;
          return (
            <li key={s.seq} className={`ps-stg is-${k}${k === "now" ? " is-ind" : ""}`} aria-label={t("stageAria", { seq: s.seq, title: s.title, name: getAgent(s.agent).name, state: stepState(s) })}>
              <div className="ps-stg-bar">
                <i style={style} />
              </div>
              <div className="ps-stg-h">
                <Agent agent={s.agent} size={20} expression={k === "done" ? "happy" : s.status === "needs_you" ? "big" : "oval"} thinking={s.status === "in_progress"} />
                <b>{s.title}</b>
              </div>
              <small>{stepState(s)}</small>
            </li>
          );
        })}
      </ol>
      <div className="ps-wdg is-camp">
        <div>
          <div className="ps-tabs" role="tablist">
            {TABS.map((k) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={`ps-tab${tab === k ? " is-on" : ""}`} onClick={() => setTab(k)}>
                {t(`tabs.${k}`)}
              </button>
            ))}
          </div>
          {tab === "deliveries" ? (
            <div className="ps-tabc">
              {data.steps.map((s) => (
                <div className="ps-ent" key={s.seq} data-step={s.seq}>
                  <div className="ps-ent-h">
                    <Agent agent={s.agent} size={24} thinking={s.status === "in_progress"} />
                    <b>{s.title}</b>
                    <span className="ps-mut">{t("entryWho", { name: getAgent(s.agent).name, state: stepState(s) })}</span>
                    {s.status === "done" && s.approved ? <span className="hs-tag hs-tag--ok">{t("approvedTag")}</span> : null}
                  </div>
                  {s.version && (s.status === "needs_you" || s.status === "done") ? <p className="ps-ent-p">{s.version.excerpt}</p> : null}
                  {s.status === "in_progress" ? <p className="ps-mut">{t("entry.in_progress", who(s.agent))}</p> : null}
                  {s.status === "pending" ? (
                    <p className="ps-mut">
                      {s.dependsOn.length ? t("entry.after", { step: titleOf(s.dependsOn[s.dependsOn.length - 1]) }) : t("entry.queued")}
                    </p>
                  ) : null}
                  {s.status === "waiting_engine" ? <p className="ps-mut">{t("entry.waiting_engine")}</p> : null}
                  {s.status === "blocked" && s.reason ? <p className="ps-mut">{s.reason}</p> : null}
                  {s.status === "failed" ? <p className="ps-mut">{t("entry.failed", who(s.agent))}</p> : null}
                  {s.status === "needs_you" && s.approvalId ? (
                    shell.canDecide ? (
                      <div className="ps-dec-a">
                        <Button
                          variant="primary"
                          size="s"
                          icon="check"
                          state={busy === `${s.approvalId}:approve` ? "loading" : "rest"}
                          loadingLabel={tw("approving")}
                          onClick={() => run(s, "approve")}
                        >
                          {tw("approve", { version: s.version?.no ?? 1 })}
                        </Button>
                        <Button variant="soft" size="s" icon={null} onClick={() => adjust(s)}>
                          {tw("adjust")}
                        </Button>
                        <Button variant="soft" size="s" icon={null} state={busy === `${s.approvalId}:revise` ? "loading" : "rest"} onClick={() => run(s, "revise")}>
                          {tw("newProposal")}
                        </Button>
                        <Button variant="soft" size="s" icon={null} state={busy === `${s.approvalId}:cancel` ? "loading" : "rest"} onClick={() => run(s, "cancel")}>
                          {tw("cancelWork")}
                        </Button>
                      </div>
                    ) : (
                      <p className="ps-mut">{tc("ownerDecides")}</p>
                    )
                  ) : null}
                </div>
              ))}
              {error ? (
                <p className="ps-dec-n" role="alert">
                  {tw("decideError")}
                </p>
              ) : null}
            </div>
          ) : null}
          {tab === "decisions" ? (
            <div className="ps-tabc">
              <div className="ps-decl">
                {data.steps
                  .filter((s) => s.status !== "waiting_engine" && s.status !== "skipped")
                  .map((s) => {
                    const ok = s.status === "done";
                    return (
                      <div key={s.seq} className={`ps-dl${ok ? " is-ok" : ""}`}>
                        <span className="ps-dl-i">{ok ? <Icon name="check" size={14} strokeWidth={2.4} /> : null}</span>
                        <div>
                          <b>{ok ? t("decision.done", { step: s.title }) : t("decision.todo", { step: s.title })}</b>
                          <small>
                            {ok
                              ? t("decision.doneSub")
                              : s.status === "needs_you"
                                ? t("decision.waitSub", { name: getAgent(s.agent).name })
                                : t("decision.laterSub", { name: getAgent(s.agent).name })}
                          </small>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : null}
          {tab === "squad" ? (
            <div className="ps-tabc">
              <div className="ps-lst">
                <div className="ps-lr is-static">
                  <Agent agent="nexo" size={28} />
                  <span className="ps-lr-t">
                    <b>{getAgent("nexo").name}</b>
                    <small>{t("nexoRole")}</small>
                  </span>
                </div>
                {data.steps.map((s) => (
                  <div className="ps-lr is-static" key={s.seq}>
                    <Agent agent={s.agent} size={28} expression={s.status === "needs_you" ? "big" : "oval"} thinking={s.status === "in_progress"} />
                    <span className="ps-lr-t">
                      <b>{getAgent(s.agent).name}</b>
                      <small>{s.responsibility ?? s.title}</small>
                    </span>
                    <span className="ps-lr-e">{stepState(s)}</span>
                  </div>
                ))}
              </div>
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
        </div>
        <aside className="ps-side2">
          <div className="ps-nextd">
            <span className="ps-k">{t("next.k")}</span>
            <div className="ps-nextd-b">
              <Agent agent={next.agent} size={32} expression={waiting ? "big" : "oval"} />
              <div>
                <b>{next.t}</b>
                <small>{next.s}</small>
              </div>
            </div>
          </div>
          <div className="ps-rules">
            <span className="ps-k">{t("rules.k")}</span>
            <div className="ps-rule">
              <svg className="ps-ic" viewBox="0 0 18 18" aria-hidden="true">
                <path d={PRODUCT_ICONS.shield} />
              </svg>
              <span>{t("rules.publish")}</span>
            </div>
            <div className="ps-rule">
              <svg className="ps-ic" viewBox="0 0 18 18" aria-hidden="true">
                <path d={PRODUCT_ICONS.lock} />
              </svg>
              <span>{t("rules.budget")}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
