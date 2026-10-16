"use client";

import { Agent, getAgent, Icon, NAV_ICONS, PRODUCT_ICONS, SQUAD, type AgentId, type SquadStageEngine } from "@hellosquad/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState, type KeyboardEvent } from "react";
import { createDirectConversationAction, sendMessageAction } from "@/app/app/[workspace]/actions";
import { useShell } from "@/components/product/shell-context";
import { SquadStage } from "./SquadStage";
import { SuggestionBand, type Suggestion } from "./SuggestionBand";

export type HomeNeed = {
  approvalId: string;
  agent: AgentId;
  title: string;
  /** "Para você revisar"… já traduzido. */
  kindLabel: string;
  cta: string;
  href: string;
};

export type HomeWork = { id: string; agent: AgentId; title: string; status: string; href: string };

export type HomeViewProps = {
  firstName: string;
  business: string;
  needs: HomeNeed[];
  inProgress: HomeWork[];
  actions?: { send: typeof sendMessageAction; create: typeof createDirectConversationAction };
};

const ORDER: AgentId[] = SQUAD.map((m) => m.id);

type CardKey = "work" | "mem" | "auto";

/** Início V3 congelado: o squad, a saudação, a pergunta, o pedido, quem participa, as sugestões e os resumos. */
export function HomeView({ firstName, business, needs, inProgress, actions }: HomeViewProps) {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const shell = useShell();
  const router = useRouter();
  const base = `/app/${shell.workspace.slug}`;
  const send = actions?.send ?? sendMessageAction;
  const create = actions?.create ?? createDirectConversationAction;
  const [input, setInput] = useState("");
  const [sel, setSel] = useState<AgentId[] | null>(null);
  const [min, setMin] = useState(false);
  const [openK, setOpenK] = useState<CardKey | null>(null);
  const [focusI, setFocusI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const engine = useRef<SquadStageEngine | null>(null);
  const selRef = useRef<HTMLDivElement>(null);

  const chosen = sel && sel.length ? sel : ORDER;
  const all = chosen.length >= ORDER.length;
  const nameOf = (a: AgentId) => getAgent(a).name;
  const joinNames = (ids: AgentId[]) =>
    ids.length <= 1 ? ids.map(nameOf).join("") : ids.slice(0, -1).map(nameOf).join(", ") + t("and") + nameOf(ids[ids.length - 1]);
  const one = chosen.length === 1 ? getAgent(chosen[0]) : null;
  const toWho = all ? t("toRoom") : one ? tc("agentTo", { article: one.article, name: one.name }) : t("toMany", { names: joinNames(chosen) });
  const selLabel = all
    ? t("selRoom")
    : one
      ? t("selOne", { with: tc("agentWith", { article: one.article, name: one.name }) })
      : t("selMany", { who: chosen.length <= 3 ? joinNames(chosen) : t("selCount", { count: chosen.length }) });
  const placeholder = all ? t("placeholderAll") : one ? t("placeholderOne", { to: toWho }) : t("placeholderMany", { names: joinNames(chosen) });
  const ready = input.trim().length > 0 && !busy;

  // Composição: topo estimado como no protótipo (sem medir), recolhido o squad fica sozinho no centro.
  const { mainW, padX } = shell.layout;
  const vh = typeof window === "undefined" ? 900 : window.innerHeight;
  const short = vh < 860;
  const cw = Math.max(300, Math.min(900, mainW - padX * 2));
  const H = Math.max(400, vh - 16);
  const minT = short ? 16 : 24;
  const estMain = short ? 406 : 463;
  const estGrid = short ? 300 : 320;
  const gapN = short ? 14 : 18;
  const topE = Math.max(minT, Math.round((H - estMain - gapN - estGrid) / 2));
  const topM = Math.max(minT, Math.round((H - estMain) * 0.47));

  function toggleAgent(a: AgentId) {
    setSel((prev) => {
      const cur = prev && prev.length ? prev : ORDER;
      if (cur.length >= ORDER.length) return [a];
      if (cur.includes(a)) {
        const next = cur.filter((x) => x !== a);
        return next.length ? next : cur;
      }
      const next = [...cur, a];
      return next.length >= ORDER.length ? null : next;
    });
  }

  function onSelKey(event: KeyboardEvent<HTMLDivElement>) {
    const dir = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    event.preventDefault();
    const next = (focusI + dir + ORDER.length) % ORDER.length;
    setFocusI(next);
    selRef.current?.querySelectorAll<HTMLButtonElement>(".hm-av")[next]?.focus();
  }

  function pick(s: Suggestion) {
    setInput(s.t);
    setSel(s.ags.length >= ORDER.length ? null : s.ags);
    document.getElementById("hm-ta")?.focus();
  }

  async function submit() {
    const body = input.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(false);
    // Um especialista: conversa direta. Squad inteiro ou grupo: a Sala do Squad (a API ainda não tem conversa em grupo).
    let target = one
      ? { conversationId: shell.conversationIds.direct[one.id] ?? null, agent: one.id as AgentId }
      : { conversationId: shell.conversationIds.room, agent: null, room: true };
    if (!target.conversationId && one) {
      const created = await create(shell.workspace.id, one.id);
      if (created.ok) target = { ...target, conversationId: created.data.id };
    }
    const result = target.conversationId ? await send(target.conversationId, body) : null;
    setBusy(false);
    if (!result?.ok) {
      setError(true);
      return;
    }
    setInput("");
    shell.openConversation(target, "panel");
  }

  const suggestions = t.raw("suggestions") as Suggestion[];
  const workSummary = [
    inProgress.length ? t("work.inProgress", { count: inProgress.length }) : t("work.none"),
    needs.length ? t("work.needs", { count: needs.length }) : "",
  ]
    .filter(Boolean)
    .join(", ");
  const faces = [...new Set([...needs.map((n) => n.agent), ...inProgress.map((w) => w.agent)])].slice(0, 3);
  const cardCls = (k: CardKey) => `hm-card${openK === k ? " is-open" : ""}`;
  const toggle = (k: CardKey) => setOpenK((cur) => (cur === k ? null : k));
  const verb = (k: CardKey) => (openK === k ? t("open") : t("closed"));

  return (
    <div className={`ps-v hm${min ? " is-min" : ""}`} style={{ maxWidth: cw, paddingTop: min ? topM : topE }}>
      <div className="hm-main">
        <header className="hm-hero">
          <SquadStage state={{ view: "home", cv: { mode: shell.conversation.mode }, homeSel: sel ? sel.map((a) => getAgent(a).shape) : null, homeMin: min }} engineRef={engine} />
          <p className="hm-hello">{t("hello", { name: firstName })}</p>
          <h1 className="hm-q">{t("question")}</h1>
        </header>

        <section className="hm-comp" aria-label={t("composeLabel")}>
          <div className="hm-box">
            <div className="hm-r1">
              <div className="ps-attw">
                <button type="button" className="hm-tb" aria-label={t("attach")} aria-haspopup="menu" data-tip={t("attachTip")} onClick={() => shell.toast(tc("unavailable"))}>
                  <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                    <path d={PRODUCT_ICONS.clip} />
                  </svg>
                </button>
              </div>
              <div className="hm-ta-w" data-v={input}>
                <label className="ps-srl" htmlFor="hm-ta">
                  {t("requestTo", { to: toWho })}
                </label>
                <textarea
                  id="hm-ta"
                  className="hm-ta"
                  rows={1}
                  placeholder={placeholder}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    engine.current?._sqType();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void submit();
                    } else if (e.key === "Escape") {
                      setInput("");
                    }
                  }}
                />
              </div>
              <button type="button" className={`hm-send${ready ? " is-ready" : ""}`} aria-label={t("send", { to: toWho })} disabled={!ready} onClick={() => void submit()}>
                <Icon name="up" size={18} strokeWidth={2.2} />
              </button>
            </div>
            <div className="hm-tray">
              <button
                type="button"
                className={`hm-squadbtn${all ? " is-on" : ""}`}
                aria-pressed={all}
                aria-label={all ? t("squadAllAria") : t("squadCallAria")}
                onClick={() => setSel(null)}
              >
                <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                  <path d={PRODUCT_ICONS.squad} />
                </svg>
                <span>{t("squad")}</span>
              </button>
              <div className="hm-sel" role="toolbar" aria-label={t("whoLabel")} onKeyDown={onSelKey} ref={selRef}>
                {ORDER.map((a, i) => {
                  const m = getAgent(a);
                  const on = all || chosen.includes(a);
                  const area = tc(`areas.${a}`);
                  const aria = all
                    ? t("avAll", { name: m.name, area, pronoun: t("pronoun", { article: m.article }) })
                    : on
                      ? chosen.length > 1
                        ? t("avOnRemove", { name: m.name, area })
                        : t("avOn", { name: m.name, area })
                      : t("avOff", { name: m.name, area });
                  return (
                    <button
                      key={a}
                      type="button"
                      className={`hm-av${all ? " is-all" : on ? " is-on" : " is-off"}`}
                      tabIndex={i === focusI ? 0 : -1}
                      aria-pressed={on}
                      aria-label={aria}
                      data-tip={t("avTip", { name: m.name, area })}
                      data-n={m.shape}
                      onClick={() => toggleAgent(a)}
                      onMouseEnter={(e) => engine.current?._sqSelHover(m.shape, e)}
                      onMouseLeave={() => engine.current?._sqSelHover(null, undefined)}
                      onFocus={(e) => {
                        setFocusI(i);
                        engine.current?._sqSelHover(m.shape, e);
                      }}
                    >
                      <Agent agent={a} size={22} expression={on ? "oval" : "sleep"} />
                    </button>
                  );
                })}
              </div>
              <span className="hm-sel-l" aria-live="polite">
                {error ? t("sendError") : selLabel}
              </span>
              <span className="hm-grow" />
              <span className={`hm-hint${ready ? " is-on" : ""}`} aria-hidden="true">
                <kbd>↵</kbd>
                {t("sendHint")}
              </span>
            </div>
          </div>
          <SuggestionBand items={suggestions} selected={input || null} onPick={pick} />
        </section>

        <div className="hm-fold">
          <button
            type="button"
            className={`hm-fold-b${min ? " is-min" : ""}`}
            aria-expanded={!min}
            aria-controls="hm-now"
            aria-label={min ? (needs.length ? t("fold.showNeeds", { count: needs.length }) : t("fold.show")) : t("fold.hideAria")}
            data-tip={min ? t("fold.show") : t("fold.hide")}
            onClick={() => setMin((v) => !v)}
          >
            <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
              <path d={PRODUCT_ICONS.chev} />
            </svg>
            {min && needs.length ? <i className="hm-fold-dot" /> : null}
          </button>
        </div>
      </div>

      <section className={`hm-now${min ? " is-min" : ""}`} id="hm-now" aria-label={t("summaries", { business })}>
        <div className="hm-now-in">
          <div className="hm-grid">
            <article className="hm-onb" id="h-onb" aria-labelledby="hm-onb-t">
              <header className="hm-onb-h">
                <span className="hm-ring" style={{ ["--p" as string]: 0 }} aria-hidden="true" />
                <h3 id="hm-onb-t">{t("onb.title", { business })}</h3>
                <small>{t("onb.done", { done: 0, total: 3 })}</small>
              </header>
              <div className="hm-ob">
                <span className="hm-ob-n" aria-hidden="true">
                  <svg className="sb-ic" viewBox="0 0 18 18">
                    <path d={PRODUCT_ICONS.globe} />
                  </svg>
                </span>
                <div className="hm-ob-b">
                  <b>{t("onb.site")}</b>
                  <small>{t("onb.siteSub")}</small>
                  <div className="hm-ob-a">
                    <label className="ps-srl" htmlFor="hm-site">
                      {t("onb.siteLabel")}
                    </label>
                    <input id="hm-site" className="ps-in" type="url" placeholder={t("onb.sitePlaceholder")} />
                    <button type="button" className="hm-btn is-dark is-s" onClick={() => shell.toast(tc("unavailable"))}>
                      {t("onb.siteRead")}
                    </button>
                  </div>
                </div>
              </div>
              <div className="hm-ob is-inline">
                <span className="hm-ob-n" aria-hidden="true">
                  <svg className="sb-ic" viewBox="0 0 18 18">
                    <path d={PRODUCT_ICONS.insta} />
                  </svg>
                </span>
                <div className="hm-ob-b">
                  <b>{t("onb.insta")}</b>
                  <small>{t("onb.instaSub")}</small>
                  <div className="hm-ob-a">
                    <button type="button" className="hm-btn is-soft is-s" onClick={() => shell.toast(tc("unavailable"), "iris")}>
                      {t("onb.instaConnect")}
                    </button>
                  </div>
                </div>
              </div>
              <div className="hm-ob is-inline">
                <span className="hm-ob-n" aria-hidden="true">
                  <svg className="sb-ic" viewBox="0 0 18 18">
                    <path d={NAV_ICONS.chat[0]} />
                  </svg>
                </span>
                <div className="hm-ob-b">
                  <b>{t("onb.talk")}</b>
                  <small>{t("onb.talkSub")}</small>
                  <div className="hm-ob-a">
                    <button
                      type="button"
                      className="hm-btn is-soft is-s"
                      onClick={() => shell.openConversation({ conversationId: shell.conversationIds.direct.nexo ?? null, agent: "nexo" })}
                    >
                      {t("onb.talkGo")}
                    </button>
                  </div>
                </div>
              </div>
            </article>

            <div className="hm-side">
              <div className={cardCls("work")} data-k="work">
                <button
                  type="button"
                  className="hm-card-h"
                  id="hm-ch-work"
                  aria-expanded={openK === "work"}
                  aria-controls="hm-cb-work"
                  aria-label={t("work.aria", { summary: workSummary }) + verb("work")}
                  onClick={() => toggle("work")}
                >
                  <span className="hm-ic" aria-hidden="true">
                    <svg className="sb-ic i-works" viewBox="0 0 18 18">
                      <path className="p1" d={NAV_ICONS.works[0]} />
                      <path className="p2" d={NAV_ICONS.works[1]} />
                      <path className="p3" d={NAV_ICONS.works[2]} />
                    </svg>
                    {needs.length ? <i className="hm-ic-dot" /> : null}
                  </span>
                  <span className="hm-row-t">
                    <b>{t("work.title")}</b>
                    <small>
                      <span>{inProgress.length ? t("work.inProgress", { count: inProgress.length }) : t("work.none")}</span>
                      {needs.length ? <span className="hm-m-need">{t("work.needs", { count: needs.length })}</span> : null}
                    </small>
                  </span>
                  <span className="hm-faces" aria-hidden="true">
                    {faces.map((a) => (
                      <Agent key={a} agent={a} size={22} outline expression={needs.some((n) => n.agent === a) ? "big" : "oval"} />
                    ))}
                  </span>
                  <svg className="sb-ic hm-row-c" viewBox="0 0 18 18" aria-hidden="true">
                    <path d={PRODUCT_ICONS.chev} />
                  </svg>
                </button>
                <div className="hm-card-b" id="hm-cb-work" role="region" aria-labelledby="hm-ch-work" inert={openK !== "work" || undefined}>
                  <div className="hm-card-in">
                    {needs.length ? (
                      <>
                        <div className="hm-cb-h">
                          <Agent agent="nexo" size={18} expression="happy" />
                          <span>
                            <b>{getAgent("nexo").name}</b> · {t("work.needH", { count: needs.length })}
                          </span>
                        </div>
                        {needs.slice(0, 3).map((n) => (
                          <div className="hm-it is-need" key={n.approvalId}>
                            <Agent agent={n.agent} size={28} expression="big" />
                            <span className="hm-it-t">
                              <b>{n.title}</b>
                              <small>{t("work.pendSub", { kind: n.kindLabel, agent: getAgent(n.agent).name })}</small>
                            </span>
                            <button type="button" className="hm-btn is-dark is-xs" aria-label={`${n.cta}: ${n.title}`} onClick={() => router.push(n.href)}>
                              {n.cta.split(" ")[0]}
                            </button>
                          </div>
                        ))}
                      </>
                    ) : null}
                    {inProgress.length ? (
                      <>
                        <div className="hm-cb-k">{t("work.rowsH")}</div>
                        {inProgress.slice(0, 3).map((w) => (
                          <button key={w.id} type="button" className="hm-it is-row" aria-label={t("work.openWork", { title: w.title, status: w.status })} onClick={() => router.push(w.href)}>
                            <Agent agent={w.agent} size={28} />
                            <span className="hm-it-t">
                              <b>{w.title}</b>
                              <small>{w.status}</small>
                            </span>
                          </button>
                        ))}
                      </>
                    ) : null}
                    {!needs.length && !inProgress.length ? <p className="hm-cb-e">{t("work.empty")}</p> : null}
                    <div className="hm-cb-f">
                      <Link className="hm-link" href={`${base}/squad/nexo`}>
                        <span>{t("work.all")}</span>
                        <Icon name="arrow" size={14} strokeWidth={2} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className={cardCls("mem")} data-k="mem">
                <button
                  type="button"
                  className="hm-card-h"
                  id="hm-ch-mem"
                  aria-expanded={openK === "mem"}
                  aria-controls="hm-cb-mem"
                  aria-label={t("mem.aria", { summary: t("mem.none") }) + verb("mem")}
                  onClick={() => toggle("mem")}
                >
                  <span className="hm-ic" aria-hidden="true">
                    <svg className="sb-ic i-spark" viewBox="0 0 18 18">
                      <path d={PRODUCT_ICONS.spark} />
                    </svg>
                  </span>
                  <span className="hm-row-t">
                    <b>{t("mem.title")}</b>
                    <small>
                      <span>{t("mem.none")}</span>
                    </small>
                  </span>
                  <span className="hm-faces" aria-hidden="true" />
                  <svg className="sb-ic hm-row-c" viewBox="0 0 18 18" aria-hidden="true">
                    <path d={PRODUCT_ICONS.chev} />
                  </svg>
                </button>
                <div className="hm-card-b" id="hm-cb-mem" role="region" aria-labelledby="hm-ch-mem" inert={openK !== "mem" || undefined}>
                  <div className="hm-card-in">
                    <p className="hm-cb-e">{t("mem.empty", { business })}</p>
                    <div className="hm-cb-f">
                      <Link className="hm-link" href={`${base}/memoria-da-marca`}>
                        <span>{t("mem.go")}</span>
                        <Icon name="arrow" size={14} strokeWidth={2} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className={cardCls("auto")} data-k="auto">
                <button
                  type="button"
                  className="hm-card-h"
                  id="hm-ch-auto"
                  aria-expanded={openK === "auto"}
                  aria-controls="hm-cb-auto"
                  aria-label={t("auto.aria", { summary: t("auto.none") }) + verb("auto")}
                  onClick={() => toggle("auto")}
                >
                  <span className="hm-ic" aria-hidden="true">
                    <svg className="sb-ic i-auto" viewBox="0 0 18 18">
                      <path className="p1" d={NAV_ICONS.auto[0]} />
                      <path className="p2" d={NAV_ICONS.auto[1]} />
                    </svg>
                  </span>
                  <span className="hm-row-t">
                    <b>{t("auto.title")}</b>
                    <small>
                      <span>{t("auto.none")}</span>
                    </small>
                  </span>
                  <span className="hm-faces" aria-hidden="true" />
                  <svg className="sb-ic hm-row-c" viewBox="0 0 18 18" aria-hidden="true">
                    <path d={PRODUCT_ICONS.chev} />
                  </svg>
                </button>
                <div className="hm-card-b" id="hm-cb-auto" role="region" aria-labelledby="hm-ch-auto" inert={openK !== "auto" || undefined}>
                  <div className="hm-card-in">
                    <div className="hm-cb-e is-act">
                      <p>{t("auto.empty")}</p>
                      <Link className="hm-btn is-soft is-xs" href={`${base}/modo-autonomo`}>
                        {t("auto.setup")}
                      </Link>
                    </div>
                    <div className="hm-cb-f">
                      <Link className="hm-link" href={`${base}/modo-autonomo`}>
                        <span>{t("auto.go")}</span>
                        <Icon name="arrow" size={14} strokeWidth={2} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
