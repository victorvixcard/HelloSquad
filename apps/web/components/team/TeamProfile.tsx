"use client";

import { Agent, AGENT_IDS, Button, getAgent, STATUS_GLYPHS, type AgentId } from "@hellosquad/ui";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useLive } from "@/components/product/live";
import { useShell } from "@/components/product/shell-context";
import { modeExpression, runningRuns, shortNowKey } from "@/lib/live/live-state";
import { madeBy, stageMetrics, STAGE_BOTTOM, statusGlyph, worksOf, WORKS_WITH, type TeamPending, type TeamWork } from "./team-data";

type ProfileTab = "now" | "skills" | "made" | "with";
const PROFILE_TABS: readonly ProfileTab[] = ["now", "skills", "made", "with"];
const SKILLS = ["k1", "k2", "k3", "k4"] as const;
const ASKS = ["q1", "q2", "q3"] as const;

/** Sinal de situação da V4.6 (anel, preenchimento e marca), o mesmo desenho dos trabalhos em todo o produto. */
function StatusSign({ k }: { k: keyof typeof STATUS_GLYPHS }) {
  const g = STATUS_GLYPHS[k];
  return (
    <svg className={`wk-sg is-${k}`} viewBox="0 0 16 16" aria-hidden="true">
      <circle className="g-o" cx="8" cy="8" r="6.2" />
      <path className="g-f" d={g.fill} />
      <path className="g-m" d={g.mark} />
    </svg>
  );
}

/**
 * Aba "Equipe": o palco com os sete (nome e área de cada um; a Kaia vem escolhida, como no protótipo) e o
 * perfil do escolhido. O "agora" sai do estado vivo real (runs e pendências), nunca de roteiro inventado.
 */
export function TeamProfile({ business, works, pending }: { business: string; works: TeamWork[]; pending: TeamPending[] }) {
  const t = useTranslations("team");
  const tc = useTranslations("common");
  const ts = useTranslations("shell");
  const tl = useTranslations("live");
  const shell = useShell();
  const live = useLive();
  const router = useRouter();
  const [sel, setSel] = useState<AgentId>("kaia");
  const [tab, setTab] = useState<ProfileTab>("now");
  const [askOpen, setAskOpen] = useState(false);
  const askRef = useRef<HTMLDivElement>(null);
  const stage = stageMetrics(shell.layout.contentW);
  const member = getAgent(sel);
  const mode = live.modes[sel];
  const face = modeExpression(mode);
  const withAgent = tc("agentWith", { article: member.article, name: member.name });

  useEffect(() => {
    if (!askOpen) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !askRef.current?.contains(event.target as Node)) setAskOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [askOpen]);

  function pick(agent: AgentId) {
    setSel(agent);
    setTab("now");
    setAskOpen(false);
  }

  /** "Conversar com a Kaia": a conversa direta mais recente, em tela cheia (`_openAgent`, L6532); sem nenhuma, um rascunho. */
  function talk(draft?: string) {
    setAskOpen(false);
    shell.openConversation({ conversationId: shell.conversationIds.direct[sel] ?? null, agent: sel, ...(draft ? { draft } : {}) }, "full");
  }

  /** A frase longa do "agora" (`_longNow`, L8067), com o que existe de verdade: pendência, run em curso ou nada. */
  function nowLine(): string {
    if (mode === "wait") {
      const p = pending.find((x) => x.agent === sel);
      if (p?.version) return t("now.wait", { version: p.version, object: t(`now.waitObject.${p.deliveryType === "04.01" ? "d0401" : "default"}`) });
      return t("now.waitPlain");
    }
    if (mode === "work") {
      const run = runningRuns(live.state).find((r) => r.agent === sel);
      const title = run?.workItemId ? works.find((w) => w.id === run.workItemId)?.title : undefined;
      const key = shortNowKey(sel, mode);
      const verb = key === "creating" || key === "writing" || key === "researching" ? key : "working";
      if (title) return t("now.work", { verb: t(`now.verb.${verb}`), title });
      const short = tl(`short.${key}`);
      return short.charAt(0).toUpperCase() + short.slice(1) + ".";
    }
    if (sel === "nexo") {
      const care = works.filter((w) => w.status === "in_progress").length;
      return care ? t("now.care", { count: care }) : t("now.idleNexo");
    }
    return sel === "iris" ? t("now.irisIdle") : t("now.idle");
  }

  const mine = worksOf(works, sel);
  const made = madeBy(works, sel);
  const intro = t(`agents.${sel}.intro`, { business });

  return (
    <>
      <section className="ps-team-stage" aria-label={t("stageLabel")}>
        <div className="ps-tstage" style={{ width: stage.w, height: stage.h }}>
          <div className="hs-stage" style={{ position: "relative", width: stage.w, height: stage.size }}>
            {AGENT_IDS.map((a, i) => (
              <div
                key={a}
                data-n={getAgent(a).shape}
                className={"hs-ag" + (a === sel ? " is-lead" : "")}
                style={{ left: i * (stage.size + stage.gap), top: Math.round((stage.size * (170 - STAGE_BOTTOM[a])) / 340), width: stage.size, height: stage.size }}
                onClick={() => pick(a)}
              >
                <Agent agent={a} size={stage.size} {...modeExpression(live.modes[a])} />
              </div>
            ))}
          </div>
          {AGENT_IDS.map((a, i) => {
            const m = getAgent(a);
            return (
              <button
                key={a}
                type="button"
                className={"ps-tn" + (a === sel ? " is-on" : "")}
                style={{ left: i * (stage.size + stage.gap), width: stage.size }}
                aria-label={t("nameAria", { name: m.name, role: m.roleFull })}
                aria-pressed={a === sel}
                onClick={() => pick(a)}
              >
                <b>{m.name}</b>
                <small>{ts(`areas.${a}`)}</small>
                <i style={{ background: m.color }} />
              </button>
            );
          })}
        </div>
      </section>
      <section className="ps-prof">
        <div className="ps-prof-hero" style={{ background: member.softTint }}>
          <div className="ps-prof-ag">
            <Agent agent={sel} size={148} expression={face.expression} thinking={face.thinking} />
          </div>
          <div className="ps-prof-id">
            <h2 className="ps-prof-n">{member.name}</h2>
            <div className="ps-prof-r">{member.roleFull}</div>
            <p className="ps-prof-p">{t(`agents.${sel}.pitch`, { business })}</p>
            <div className="ps-prof-now">
              <span className="ps-live-s" />
              <span>{nowLine()}</span>
            </div>
            <div className="ps-prof-a">
              <Button variant="primary" size="s" icon={null} onClick={() => talk()}>
                {t("talk", { with: withAgent })}
              </Button>
              <div className="ps-askw" ref={askRef}>
                <Button variant="soft" size="s" aria-haspopup="menu" aria-expanded={askOpen} onClick={() => setAskOpen((v) => !v)}>
                  {t("ask")}
                </Button>
                {askOpen ? (
                  <div className="ps-pop ps-pop-ask">
                    <div className="hs-menu" role="menu" aria-label={t("askTitle")}>
                      <div className="hs-menu-h">{t("askTitle")}</div>
                      {ASKS.map((q) => {
                        const text = t(`agents.${sel}.asks.${q}`, { business });
                        return (
                          <button key={q} type="button" role="menuitem" className="hs-mi" onClick={() => talk(text)}>
                            {text}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="ps-prof-d">
          <div className="ps-tabs" role="tablist">
            {PROFILE_TABS.map((k) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={"ps-tab" + (tab === k ? " is-on" : "")} onClick={() => setTab(k)}>
                {t(`profileTabs.${k}`)}
              </button>
            ))}
          </div>
          {tab === "now" ? (
            <div className="ps-tabc" role="tabpanel">
              {mine.length ? (
                <div className="ps-lst">
                  {mine.map((w) => {
                    const k = statusGlyph(w.status);
                    const wm = live.modes[w.agent];
                    return (
                      <button key={w.id} type="button" className="ps-lr" onClick={() => router.push(w.href)}>
                        <Agent agent={w.agent} size={26} {...modeExpression(wm)} />
                        <span className="ps-lr-t">
                          <b>{w.title}</b>
                          <small>{w.waitVersion ? t("work.waitVersion", { version: w.waitVersion }) : tc(`areas.${w.agent}`)}</small>
                        </span>
                        <span className={`v41-tag is-${k}`}>
                          <StatusSign k={k} />
                          <span>{tc(`states.${w.status}`)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="ps-empty-s">{t("noNow", { intro })}</p>
              )}
            </div>
          ) : null}
          {tab === "skills" ? (
            <div className="ps-tabc" role="tabpanel">
              <p className="ps-tab-p">{intro}</p>
              <div className="ps-skills">
                {SKILLS.map((k) => (
                  <span key={k} className="ps-skill">
                    {t(`agents.${sel}.skills.${k}`)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {tab === "made" ? (
            <div className="ps-tabc" role="tabpanel">
              {made.length ? (
                <div className="ps-made">
                  {made.map((w) => (
                    <button key={w.id} type="button" className="ps-made-i" onClick={() => router.push(w.href)}>
                      <span className="ps-prev">
                        <span className="ps-doc">
                          <span className="ps-doc-k">{w.deliveryType === "04.01" ? tc("deliveryTypes.d0401") : tc(`areas.${w.agent}`)}</span>
                          <span className="ps-doc-t">{w.title}</span>
                          <span className="ps-doc-l" />
                          <span className="ps-doc-l is-m" />
                          <span className="ps-doc-l is-s" />
                        </span>
                      </span>
                      <span className="ps-made-t">{w.title}</span>
                      <small>{tc(`states.${w.status}`)}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="ps-empty-s">{t("noMade", { business })}</p>
              )}
            </div>
          ) : null}
          {tab === "with" ? (
            <div className="ps-tabc" role="tabpanel">
              <div className="ps-with">
                {WORKS_WITH[sel].map((a) => (
                  <button key={a} type="button" className="ps-with-i" onClick={() => pick(a)}>
                    <Agent agent={a} size={36} />
                    <b>{getAgent(a).name}</b>
                    <small>{ts(`areas.${a}`)}</small>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
