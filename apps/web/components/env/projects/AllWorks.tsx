"use client";

import { Agent, AGENT_IDS, getAgent, Icon, PRODUCT_ICONS, type AgentExpression, type AgentId } from "@hellosquad/ui";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useLive } from "@/components/product/live";
import {
  agentOk,
  agentsOf,
  columnItems,
  COLUMNS,
  FORMATS,
  KIND_FILTERS,
  kindOk,
  VIEWS,
  visibleWorks,
  type BoardWork,
  type Family,
  type Format,
  type KindFilter,
  type View,
} from "./board";
import { StatusGlyph } from "./StatusGlyph";

type Item = BoardWork & { family: Family };

const VIEW_ICON: Record<View, string> = { board: PRODUCT_ICONS.board, list: PRODUCT_ICONS.list, library: PRODUCT_ICONS.klib };
const FOOT_ICON: Record<Family, string> = {
  you: PRODUCT_ICONS.cal,
  and: PRODUCT_ICONS.clock,
  prog: PRODUCT_ICONS.cal,
  done: PRODUCT_ICONS.okc,
  pause: PRODUCT_ICONS.pause,
};

function faceOf(family: Family): AgentExpression {
  return family === "you" ? "big" : family === "pause" ? "sleep" : family === "done" ? "happy" : "oval";
}

/**
 * "Todos os trabalhos" da página Projetos (V4.6 L4833; `_vWorks` L8827, V4.3 L12056): Quadro (padrão), Lista e
 * Biblioteca, filtro de tipo e por especialista, "Limpar filtros" e os vazios da própria V4.6. A situação se lê
 * pela forma do sinal (anel, ponto, relógio, check, pausa), nunca só pela cor; não há barra de progresso.
 */
export function AllWorks({ works, narrow }: { works: BoardWork[]; narrow: boolean }) {
  const t = useTranslations("projects");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const live = useLive();
  const [view, setView] = useState<View>("board");
  const [kind, setKind] = useState<KindFilter>("all");
  const [agent, setAgent] = useState<AgentId | null>(null);
  const [format, setFormat] = useState<Format>("all");
  const [kindOpen, setKindOpen] = useState(false);
  // V4.6 alterna is-fa/is-fb a cada troca de visão ou filtro: os cartões entram de novo, com a animação curta.
  const [par, setPar] = useState(false);
  const kindRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!kindOpen) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !kindRef.current?.contains(event.target as Node)) setKindOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [kindOpen]);

  const change = (fn: () => void) => {
    fn();
    setPar((p) => !p);
  };
  const names = (ids: AgentId[]) =>
    new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(ids.map((a) => getAgent(a).name));

  const all = visibleWorks(works);
  const shown = all.filter((w) => kindOk(w, kind) && agentOk(w, agent));
  const open = (href: string) => router.push(href);

  // Situação, próximo passo, data e rodapé de cada trabalho (`_wkDesc`, L8662), só com o que a API devolve.
  const describe = (w: Item) => {
    const lead = w.lead;
    const co = agentsOf(w).slice(1);
    const working = w.family === "and" && live.modes[lead] === "work";
    const leadName = getAgent(lead).name;
    const need = w.family === "you" ? w.need : null;
    const sit =
      w.family === "you"
        ? need?.version
          ? need.due
            ? t("sit.reviewDue", { version: need.version, due: need.due })
            : t("sit.review", { version: need.version })
          : t("st.you")
        : tc(`states.${w.status}`);
    const nextA = need ? need.cta : w.family === "done" ? t("foot.approvedByYou") : "";
    const foot = w.family === "done" ? t("foot.approved") : w.family === "pause" ? t("foot.paused") : "";
    const dateL = need?.due ? t("foot.until", { due: need.due }) : "";
    const stL = working ? t("st.working") : t(`st.${w.family}`);
    const coL = co.length ? names(co) : "";
    const teamL = (working ? t("card.working", { name: leadName }) : t("card.responds", { name: leadName })) + (coL ? t("card.with", { names: coL }) : "");
    const aria = t("card.aria", {
      title: w.title,
      st: stL,
      sit,
      next: nextA ? t("card.ariaNext", { next: nextA }) : "",
      lead: leadName,
      co: coL ? t("card.ariaCo", { names: coL }) : "",
    });
    const kindL = w.coordinated ? t("kinds.project") : w.project ? t("kinds.work") : t("kinds.delivery");
    const sitL = w.coordinated && w.step && !need ? t("sitStep", { sit, step: w.step }) : sit;
    return { lead, co, working, sit: sitL, nextA, foot, dateL, stL, teamL, aria, need, kindL };
  };

  const team = (w: Item, d: ReturnType<typeof describe>, size: number) => {
    const shownCo = d.co.slice(0, 2);
    const rest = d.co.length - shownCo.length;
    const coX: AgentExpression = w.family === "pause" ? "sleep" : w.family === "done" ? "happy" : "oval";
    return (
      <span className="wk-team" title={d.teamL}>
        <span className={`wk-lead${d.working ? " is-work" : ""}`} style={{ "--ag": getAgent(d.lead).color } as CSSProperties}>
          <Agent agent={d.lead} size={size} expression={faceOf(w.family)} thinking={d.working} />
        </span>
        {shownCo.map((a) => (
          <Agent key={a} agent={a} size={20} outline expression={coX} />
        ))}
        {rest > 0 ? <span className="wk-more">{t("card.more", { count: rest })}</span> : null}
      </span>
    );
  };

  const cta = (d: ReturnType<typeof describe>) =>
    d.need ? (
      <button
        type="button"
        className="hm-btn is-dark is-xs wk-cta"
        aria-label={t("card.ctaAria", { cta: d.need.cta, title: d.need.title })}
        onClick={() => open(d.need!.href)}
      >
        <span>{d.need.cta.split(" ")[0]}</span>
        <Icon name="arrow" size={14} strokeWidth={2} />
      </button>
    ) : null;

  const nextSpan = (w: Item, text: string) =>
    text ? (
      <span className="wk-n">
        <svg className="wk-ic" viewBox="0 0 18 18" aria-hidden="true">
          <path d={FOOT_ICON[w.family]} />
        </svg>
        <span>{text}</span>
      </span>
    ) : null;

  const kindIcon = (w: Item) => (w.project ? PRODUCT_ICONS.folder : PRODUCT_ICONS.deliv);

  const card = (w: Item) => {
    const d = describe(w);
    const cls = "wk-card" + (w.family === "you" ? " is-you" : "") + (w.family === "pause" ? " is-paused" : "") + (w.family === "done" ? " is-done" : "");
    return (
      <article className={cls} key={w.id} data-work={w.id}>
        <div className="wk-b">
          <div className="wk-k">
            <svg className="wk-ic" viewBox="0 0 18 18" aria-hidden="true">
              <path d={kindIcon(w)} />
            </svg>
            <span>{d.kindL}</span>
            {w.project && !w.coordinated ? <span className="wk-k-p">{w.project}</span> : null}
          </div>
          <h3 className="wk-t">{w.title}</h3>
          <p className="wk-s">{d.sit}</p>
        </div>
        <button type="button" className="wk-a" aria-label={d.aria} onClick={() => open(w.href)} />
        <div className="wk-f">
          {team(w, d, 26)}
          {d.need ? cta(d) : nextSpan(w, d.foot)}
        </div>
      </article>
    );
  };

  const row = (w: Item) => {
    const d = describe(w);
    const rcls = "wk-row" + (w.family === "you" ? " is-you" : "") + (w.family === "pause" ? " is-paused" : "");
    return (
      <div className={rcls} key={w.id} data-work={w.id}>
        <span className="wk-r-th" aria-hidden="true">
          <svg className="wk-ic" viewBox="0 0 18 18" aria-hidden="true">
            <path d={kindIcon(w)} />
          </svg>
        </span>
        <span className="wk-r-m">
          <button type="button" className="wk-a" aria-label={d.aria} onClick={() => open(w.href)}>
            {w.title}
          </button>
          <small>
            {w.coordinated ? t("kinds.project") : w.project ? t("kinds.workOf", { project: w.project }) : t("kinds.delivery")} · {d.sit}
          </small>
        </span>
        <span className={`wk-st is-${w.family}`}>
          <StatusGlyph family={w.family} />
          <span>{d.stL}</span>
        </span>
        <span className="wk-r-team">
          {team(w, d, 24)}
          <span className="wk-r-ln">{getAgent(d.lead).name}</span>
        </span>
        <span className="wk-r-d">{d.dateL || "—"}</span>
        <span className="wk-r-n">{d.need ? cta(d) : nextSpan(w, d.nextA)}</span>
      </div>
    );
  };

  const clear = () =>
    change(() => {
      setKind("all");
      setAgent(null);
      setFormat("all");
    });
  const none = (title: string, text: string | null, withClear: boolean, face: AgentId = "nexo") => (
    <div className="wk-none">
      <Agent agent={face} size={40} expression="oval" />
      <b>{title}</b>
      {text ? <span>{text}</span> : null}
      {withClear ? (
        <button type="button" className="hm-btn is-soft is-s" onClick={clear}>
          <span>{t("all.clear")}</span>
        </button>
      ) : null}
    </div>
  );

  const fa = par ? " is-fa" : " is-fb";
  const cols = COLUMNS.map((c) => ({ c, items: columnItems(shown, c) }));
  const groups = cols.filter((g) => g.items.length > 0);
  // Biblioteca: peças e documentos produzidos. A entrega da Fase 1 é texto (legenda), que na V4.6 vive dentro do
  // trabalho (aba "Legenda") e não é peça nem documento: a Biblioteca fica no vazio da própria V4.6.
  const library: Array<{ cat: Exclude<Format, "all"> }> = [];

  return (
    <section className={"wk pj-all" + (narrow ? " is-nar" : "")} aria-labelledby="pj-all-t">
      <header className="pj-all-h">
        <h2 id="pj-all-t" className="v4-h2">
          {t("all.title")}
        </h2>
        <small>{t("all.sub")}</small>
      </header>
      <div className="wk-tb">
        <div className="wk-views" role="group" aria-label={t("all.views")}>
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              className={"wk-view" + (view === v ? " is-on" : "")}
              aria-pressed={view === v}
              aria-label={t(`all.view.${v}`)}
              data-tip={t(`all.view.${v}`)}
              onClick={() => change(() => setView(v))}
            >
              <svg className="wk-ic" viewBox="0 0 18 18" aria-hidden="true">
                <path d={VIEW_ICON[v]} />
              </svg>
              <span>{t(`all.view.${v}`)}</span>
            </button>
          ))}
        </div>
        <div className="wk-fl">
          {view === "library" ? (
            <div className="wk-fmt" role="group" aria-label={t("all.formats")}>
              {FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={"wk-fmtb" + (format === f ? " is-on" : "")}
                  aria-pressed={format === f}
                  onClick={() => change(() => setFormat(f))}
                >
                  <span>{t(`all.format.${f}`)}</span>
                  <i>{library.filter((m) => f === "all" || m.cat === f).length}</i>
                </button>
              ))}
            </div>
          ) : (
            <div className="wk-kind" ref={kindRef}>
              <button
                type="button"
                className={"wk-kindb" + (kind !== "all" ? " is-set" : "")}
                aria-haspopup="menu"
                aria-expanded={kindOpen}
                aria-label={t("all.kindAria", { kind: t(`all.kindAriaValue.${kind}`) })}
                onClick={() => setKindOpen((o) => !o)}
              >
                <svg className="wk-ic" viewBox="0 0 18 18" aria-hidden="true">
                  <path d={PRODUCT_ICONS.filt} />
                </svg>
                <span>{t(`all.kind.${kind}`)}</span>
                <svg className="wk-ic wk-kind-c" viewBox="0 0 18 18" aria-hidden="true">
                  <path d={PRODUCT_ICONS.chev} />
                </svg>
              </button>
              {kindOpen ? (
                <div className="ps-pop wk-pop-kind">
                  <div className="hs-menu" role="menu" aria-label={t("all.kindMenu")}>
                    <div className="hs-menu-h">{t("all.kindMenu")}</div>
                    {KIND_FILTERS.map((k) => (
                      <div
                        key={k}
                        role="menuitemradio"
                        aria-checked={kind === k}
                        tabIndex={0}
                        className="hs-mi"
                        onClick={() => {
                          change(() => setKind(k));
                          setKindOpen(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            change(() => setKind(k));
                            setKindOpen(false);
                          }
                        }}
                      >
                        {t(`all.kindItem.${k}`)}
                        <span className="hs-end">
                          {kind === k ? (
                            <span style={{ color: "#0F0D22" }}>
                              <Icon name="check" size={18} strokeWidth={2.2} />
                            </span>
                          ) : null}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
          <div className={"wk-agf" + (agent ? " is-set" : "")} role="group" aria-label={t("all.agentFilter")}>
            {AGENT_IDS.map((a) => {
              const m = getAgent(a);
              const on = agent === a;
              const withL = tc("agentWith", { article: m.article, name: m.name });
              return (
                <button
                  key={a}
                  type="button"
                  className={"wk-agf-b" + (on ? " is-on" : "")}
                  aria-pressed={on}
                  aria-label={on ? t("all.agentShowing", { with: withL }) : t("all.agentShow", { with: withL })}
                  data-tip={t("all.agentTip", { name: m.name, role: t(`roles.${a}`) })}
                  onClick={() => change(() => setAgent((cur) => (cur === a ? null : a)))}
                >
                  <Agent agent={a} size={22} expression={on ? "happy" : "oval"} />
                </button>
              );
            })}
            {agent ? (
              <>
                <span className="wk-agf-l">{getAgent(agent).name}</span>
                <button type="button" className="wk-agf-x" aria-label={t("all.agentClear")} onClick={() => change(() => setAgent(null))}>
                  <svg className="wk-ic" viewBox="0 0 18 18" aria-hidden="true">
                    <path d={PRODUCT_ICONS.xx} />
                  </svg>
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {view === "board" ? (
        !all.length ? (
          none(t("all.noneTitle"), t("all.noneText"), false)
        ) : (
          <div className={"wk-board" + fa}>
            {cols.map(({ c, items }) => (
              <section key={c} className={`wk-lane is-${c}`} aria-label={t("colAria", { col: t(`cols.${c}`), count: items.length })}>
                <header className="wk-lane-h">
                  <StatusGlyph family={c === "you" && !items.length ? "done" : c} />
                  <h2>{t(`cols.${c}`)}</h2>
                  <i className={"wk-cnt" + (c === "you" && items.length ? " is-hot" : "")}>{items.length}</i>
                </header>
                <div className="wk-lane-b">
                  {items.length ? items.map(card) : <div className="wk-empty">{t(`colsEmpty.${c}`)}</div>}
                </div>
              </section>
            ))}
          </div>
        )
      ) : null}

      {view === "list" ? (
        <div className={"wk-list" + fa}>
          {groups.map(({ c, items }) => (
            <section key={c} className={`wk-lg is-${c}`} aria-label={t("groupAria", { col: t(`cols.${c}`), count: items.length })}>
              <header className="wk-lg-h">
                <StatusGlyph family={c} />
                <h2>{t(`cols.${c}`)}</h2>
                <i className={"wk-cnt" + (c === "you" && items.length ? " is-hot" : "")}>{items.length}</i>
                <span className="wk-lg-cols" aria-hidden="true">
                  <span>{t("listCols.situation")}</span>
                  <span>{t("listCols.owner")}</span>
                  <span>{t("listCols.date")}</span>
                  <span>{t("listCols.next")}</span>
                </span>
              </header>
              <div className="wk-rows">{items.map(row)}</div>
            </section>
          ))}
          {!groups.length ? (all.length ? none(t("all.filteredTitle"), null, true) : none(t("all.noneTitle"), t("all.noneText"), false)) : null}
        </div>
      ) : null}

      {view === "library" ? (
        <div className={"wk-lib" + fa}>
          {library.length
            ? none(t("all.libFilteredTitle"), null, true, "kaia")
            : none(t("all.libNoneTitle"), t("all.libNoneText"), false, "kaia")}
        </div>
      ) : null}
    </section>
  );
}
