"use client";

import { Agent, getAgent, Icon, isAgentId, PRODUCT_ICONS } from "@hellosquad/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { decideApprovalAction } from "@/app/app/[workspace]/actions";
import { useShell } from "@/components/product/shell-context";
import {
  dayNum,
  isoOf,
  isoWeek,
  mergePosts,
  MONTH_MAX,
  MONTH_MIN,
  mondayOf,
  monthGrid,
  monthTitle,
  shortDate,
  statusSk,
  timeParts,
  todayIso,
  WEEK_MAX,
  WEEK_MIN,
  weekRangeParts,
  type CalendarData,
  type CalendarPost,
} from "./content/calendar";
import { loadCalendarAction } from "./content/calendar-actions";
import { Glyph, ListView, MonthView, OwnerFace, StatusPill, WeekView, type CalItem, type View } from "./content/CalendarViews";
import { EnvIdentity } from "./EnvIdentity";
import { NeedsStrip, type StripNeed } from "./NeedsStrip";

const capF = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Conteúdo · Otto, as quatro camadas da V4.6: identidade com "Conversar com o Otto"; a visão protagonista
 * (calendário editorial, A2b: os posts da API em semana, mês e lista, com o inspetor do post); os componentes
 * inteligentes (próximas publicações = a pauta que vem; desempenho orgânico e "Otto percebeu" seguem no vazio da
 * V4.6, sem números no banco); e a conversa contextual (o painel universal, com o post como objeto).
 */
export function ContentEnvironment({ business, needs, now, calendar }: { business: string; needs: StripNeed[]; now?: Date; calendar?: CalendarData }) {
  const t = useTranslations("content");
  const te = useTranslations("editorial");
  const shell = useShell();
  const router = useRouter();
  const locale = useLocale();
  const [view, setView] = useState<View>("week");
  const [offset, setOffset] = useState(0);
  const [moff, setMoff] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [extra, setExtra] = useState<{ ranges: Array<[string, string]>; items: CalendarPost[] }>({ ranges: [], items: [] });
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [decideError, setDecideError] = useState(false);
  const otto = getAgent("otto");
  const todayS = calendar?.today ?? todayIso(now ?? new Date());
  const today = dayNum(todayS);
  const w0 = mondayOf(today);
  const ws = w0 + offset * 7;
  const grid = monthGrid(todayS, moff);
  const slug = shell.workspace.slug;
  const contentHref = `/app/${slug}/squad/otto`;

  // A janela inicial vem do servidor (vale a leitura mais nova: depois de aprovar, `router.refresh()` traz a pauta).
  const posts = useMemo(() => {
    const base = calendar?.items ?? [];
    const outside = extra.items.filter((p) => !calendar || p.scheduled_on < calendar.from || p.scheduled_on > calendar.to);
    return mergePosts(outside, base);
  }, [calendar, extra.items]);

  const items: CalItem[] = useMemo(
    () =>
      posts.map((post) => {
        const sk = statusSk(post.status);
        const version = post.delivery_version_id ? calendar?.versions[post.delivery_version_id] : undefined;
        const tp = timeParts(post.scheduled_time);
        const time = tp ? (tp.m === "00" ? te("timeH", { h: tp.h }) : te("timeHM", tp)) : null;
        // Canal ou formato que o catálogo ainda não traduz aparece pelo id, nunca some.
        const known = (group: "channels" | "formats", id: string) => {
          const key = `${group}.${id}` as Parameters<typeof te>[0];
          return te.has(key) ? te(key) : id;
        };
        const owner = isAgentId(post.owner_agent_id) ? post.owner_agent_id : "otto";
        const stL =
          post.status === "draft" ? te("status.draft") : post.status === "planned" ? te("status.planned") : post.status === "published" ? te("status.published") : te("status.scheduled");
        const stS =
          post.status === "draft"
            ? version
              ? te("status.draftSub", { n: version.no })
              : te("status.draftSubPlain")
            : post.status === "planned"
              ? te("status.plannedSub")
              : post.status === "published"
                ? te("status.publishedSub")
                : te("status.scheduledSub");
        return {
          id: post.id,
          post,
          d: dayNum(post.scheduled_on),
          sk,
          stL,
          stS,
          channel: known("channels", post.channel),
          format: known("formats", post.format),
          time,
          date: shortDate(dayNum(post.scheduled_on), locale),
          owner,
          who: getAgent(owner).name,
        };
      }),
    [posts, calendar?.versions, te, locale],
  );
  const has = items.length > 0;
  const selected = sel ? (items.find((x) => x.id === sel) ?? null) : null;

  // Mês fora da janela inicial: a tela pede só a grade que falta (até 42 dias).
  useEffect(() => {
    if (view !== "month" || !calendar) return;
    const from = isoOf(grid.g0);
    const to = isoOf(grid.g1);
    const covered = (calendar.from <= from && calendar.to >= to) || extra.ranges.some(([a, b]) => a <= from && b >= to);
    if (covered) return;
    let live = true;
    loadCalendarAction(shell.workspace.id, from, to).then((res) => {
      if (!live) return;
      if (!res.ok) {
        setLoadError(true);
        return;
      }
      setLoadError(false);
      setExtra((e) => ({ ranges: [...e.ranges, [from, to]], items: mergePosts(e.items, res.items) }));
    });
    return () => {
      live = false;
    };
  }, [view, grid.g0, grid.g1, calendar, extra.ranges, shell.workspace.id]);

  // Esc fecha o detalhe (V4.6: "Esc ou botão fecha").
  useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSel(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sel]);

  const r = weekRangeParts(ws, locale);
  const range =
    view === "month"
      ? monthTitle(grid.year, grid.month, locale)
      : (r.sameMonth ? t("rangeSame", { from: r.from, to: r.to, month: r.month }) : t("rangeCross", { from: r.from, monthFrom: r.monthFrom, to: r.to, month: r.month })) +
        (offset === 0 ? ` · ${t("thisWeek")}` : "");
  const isWeek = view === "week";
  const noPrev = isWeek ? offset <= WEEK_MIN : moff <= MONTH_MIN;
  const noNext = isWeek ? offset >= WEEK_MAX : moff >= MONTH_MAX;
  const away = isWeek ? offset !== 0 : moff !== 0;

  const talk = (agent: "otto" | "iris" | "kaia") =>
    shell.openConversation({
      conversationId: shell.conversationIds.direct[agent] ?? null,
      agent,
      context: agent === "otto" ? { kind: "env", label: t("work.back") } : undefined,
    });
  const talkPost = (x: CalItem) => {
    const period = te("ctx.period", { n: isoWeek(x.d) });
    const origin = te(`ctx.origin.${view}`);
    shell.openConversation({
      conversationId: null,
      agent: "otto",
      context: {
        kind: "calendar_post",
        label: x.post.theme,
        href: contentHref,
        period,
        origin,
        ref: { type: "calendar_post", id: x.post.id, title: x.post.theme, period, origin },
      },
    });
  };
  const pick = (id: string) => {
    setDecideError(false);
    setSel((s) => (s === id ? null : id));
  };
  // "Próximas publicações" leva ao post no calendário (V4.6 `_ctFocus`): a semana dele, selecionado.
  const focus = (x: CalItem) => {
    setView("week");
    setOffset(Math.max(WEEK_MIN, Math.min(WEEK_MAX, Math.round((mondayOf(x.d) - w0) / 7))));
    setSel(x.id);
  };
  const tight = shell.layout.contentW < 1040;
  const nar = shell.layout.contentW < 900;
  const upcoming = items.filter((x) => x.d >= today && x.post.status !== "published").slice(0, 3);

  const version = selected?.post.delivery_version_id ? calendar?.versions[selected.post.delivery_version_id] : undefined;
  const canApprove = !!selected && selected.post.status === "draft" && !!version && shell.canDecide;
  const approve = async () => {
    if (!version) return;
    setBusy(true);
    setDecideError(false);
    const res = await decideApprovalAction(version.approvalId, "approved");
    setBusy(false);
    if (!res.ok) {
      setDecideError(true);
      return;
    }
    router.refresh();
  };
  const workId = selected?.post.work_item_id ?? null;
  const origin = workId ? (calendar?.works[workId] ?? te("insp.originWork")) : te("insp.originCalendar");

  return (
    <div className="ps-v is-wide v4 ct" style={{ maxWidth: shell.layout.contentW }}>
      <EnvIdentity agent="otto" business={business} />
      <NeedsStrip items={needs} />
      <section className="v4-card v41-main ct-cal" aria-labelledby="ct-cal-t">
        <header className="ct-bar">
          <h2 id="ct-cal-t" className="ps-srl">
            {t("calendar")}
          </h2>
          <div className="v4-seg" role="group" aria-label={t("viewsLabel")}>
            {(["week", "month", "list"] as const).map((v) => (
              <button key={v} type="button" className={`v4-seg-b${view === v ? " is-on" : ""}`} aria-pressed={view === v} onClick={() => setView(v)}>
                {t(`views.${v}`)}
              </button>
            ))}
          </div>
          {view !== "list" ? (
            <div className="ct-nav">
              <button
                type="button"
                className="ct-arw is-prev"
                aria-label={isWeek ? t("prevWeek") : te("prevMonth")}
                disabled={noPrev}
                onClick={() => (isWeek ? setOffset((o) => Math.max(WEEK_MIN, o - 1)) : setMoff((m) => Math.max(MONTH_MIN, m - 1)))}
              >
                <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                  <path d={PRODUCT_ICONS.chevR} />
                </svg>
              </button>
              <span className="ct-rg" aria-live="polite">
                {range}
              </span>
              <button
                type="button"
                className="ct-arw"
                aria-label={isWeek ? t("nextWeek") : te("nextMonth")}
                disabled={noNext}
                onClick={() => (isWeek ? setOffset((o) => Math.min(WEEK_MAX, o + 1)) : setMoff((m) => Math.min(MONTH_MAX, m + 1)))}
              >
                <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                  <path d={PRODUCT_ICONS.chevR} />
                </svg>
              </button>
              {away ? (
                <button
                  type="button"
                  className="ct-hoje"
                  onClick={() => {
                    setOffset(0);
                    setMoff(0);
                  }}
                >
                  {t("today")}
                </button>
              ) : null}
            </div>
          ) : null}
          <span className="ps-grow" />
          {has ? (
            <span className="ct-key" aria-hidden="true">
              <span className="ct-key-i is-you">
                <i />
                {te("legend.you")}
              </span>
              <span className="ct-key-i is-prog">
                <i />
                {te("legend.prog")}
              </span>
              <span className="ct-key-i is-done">
                <i />
                {te("legend.done")}
              </span>
            </span>
          ) : null}
        </header>
        {has ? (
          <>
            {view === "week" ? <WeekView items={items} sel={sel} today={today} onPick={pick} onTalk={talkPost} nar={nar} tight={tight} ws={ws} /> : null}
            {view === "month" ? <MonthView items={items} sel={sel} today={today} onPick={pick} onTalk={talkPost} nar={nar} tight={tight} grid={grid} /> : null}
            {view === "list" ? <ListView items={items} sel={sel} today={today} onPick={pick} onTalk={talkPost} nar={nar} tight={tight} /> : null}
            {selected ? (
              <div className={`ct-ins is-post${selected.sk === "you" ? " is-you" : ""}`} role="region" aria-label={te("insp.region", { title: selected.post.theme })}>
                <div className="ct-ins-b">
                  <div className="ct-ins-h">
                    <StatusPill sk={selected.sk} label={capF(selected.stS)} />
                    <span className="ct-ins-w">{[[selected.date, selected.time].filter(Boolean).join(", "), selected.channel, selected.format].join(" · ")}</span>
                    <button type="button" className="ps-iconbtn is-s ct-ins-x" aria-label={te("insp.close")} onClick={() => setSel(null)}>
                      <Icon name="close" size={14} strokeWidth={2} />
                    </button>
                  </div>
                  <h3 className="ct-ins-t">{selected.post.theme}</h3>
                  {selected.post.notes ? <p className="ct-ins-s">{selected.post.notes}</p> : null}
                  <dl className="ct-ins-f">
                    <div>
                      <dt>{te("insp.who")}</dt>
                      <dd className="ct-ins-who">
                        <OwnerFace agent={selected.owner} size={16} />
                        <span>{selected.who}</span>
                      </dd>
                    </div>
                    <div>
                      <dt>{te("insp.origin")}</dt>
                      <dd>{origin}</dd>
                    </div>
                  </dl>
                  <div className="ct-ins-a">
                    {canApprove && version ? (
                      <button type="button" className="hm-btn is-dark is-s" disabled={busy} onClick={approve}>
                        <span>{busy ? t("work.approving") : t("work.approve", { version: version.no })}</span>
                      </button>
                    ) : null}
                    <button type="button" className={`hm-btn ${canApprove ? "is-soft" : "is-dark"} is-s`} onClick={() => talkPost(selected)}>
                      <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                        <path d={PRODUCT_ICONS.ask} />
                      </svg>
                      <span>{te("insp.talk")}</span>
                    </button>
                    {workId ? (
                      <Link className="hm-link" href={`/app/${slug}/squad/otto/trabalho/${workId}`}>
                        <span>{te("insp.openWork")}</span>
                        <Icon name="arrow" size={14} strokeWidth={2} />
                      </Link>
                    ) : null}
                  </div>
                  {decideError ? (
                    <p className="ct-ins-s" role="alert">
                      {t("work.decideError")}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="v4-empty v41-empty">
            <Agent agent="otto" size={48} expression="oval" />
            <b>{t("empty.title", { article: otto.article, agent: otto.name, business })}</b>
            <span>{t("empty.text")}</span>
            <span className="v4-empty-a">
              <Link className="hm-btn is-dark is-s" href={`/app/${slug}/modo-autonomo`}>
                {t("empty.delegate")}
              </Link>
              <button type="button" className="hm-btn is-soft is-s" onClick={() => talk("kaia")}>
                {t("empty.askKaia")}
              </button>
            </span>
          </div>
        )}
        {loadError || (calendar && !calendar.ok) ? (
          <p className="v41-cd-e" role="status">
            {te("loadError")}
          </p>
        ) : null}
      </section>
      <div className={`v41-low is-3 ct-low${tight ? " is-nar" : ""}`}>
        <section className="v41-cd v41-dl" aria-labelledby="ct-a-t">
          <header className="v41-cd-h">
            <h3 id="ct-a-t">{t("next.title")}</h3>
            <button type="button" className="v4-ask is-s" aria-label={t("next.talk")} data-tip={t("next.talkTip")} onClick={() => talk("otto")}>
              <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                <path d={PRODUCT_ICONS.ask} />
              </svg>
            </button>
          </header>
          {upcoming.length ? (
            <div className="v41-tiles">
              {upcoming.map((x) => (
                <button key={x.id} type="button" className={`v41-tile is-${x.sk}`} aria-label={te("tileAria", { title: x.post.theme, status: x.stL, date: x.date })} onClick={() => focus(x)}>
                  <span className="v41-tile-v">
                    <span className="v41-tile-ph">
                      <span>{x.format}</span>
                    </span>
                  </span>
                  <span className="v41-tile-d">{x.date}</span>
                  <b className="v41-tile-t">{x.post.theme}</b>
                  <span className={`v41-tag is-${x.sk}`}>
                    <Glyph sk={x.sk} />
                    <span>{x.stL}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="v41-cd-e">{t("next.empty")}</p>
          )}
        </section>
        <section className="v41-cd" aria-labelledby="ct-b-t">
          <header className="v41-cd-h">
            <h3 id="ct-b-t">{t("perf.title")}</h3>
            <button type="button" className="v4-ask is-s" aria-label={t("perf.talk")} data-tip={t("perf.talkTip")} onClick={() => talk("iris")}>
              <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                <path d={PRODUCT_ICONS.ask} />
              </svg>
            </button>
          </header>
          <p className="v41-cd-e">{t("perf.empty")}</p>
        </section>
        <section className="v41-ai is-pill in6-box" aria-labelledby="ct-c-t">
          <i className="lv6-r" aria-hidden="true" />
          <header className="v41-cd-h">
            <Agent agent="otto" size={22} expression="oval" />
            <h3 id="ct-c-t" className="in6-k">
              {t("noticed.title")}
            </h3>
            <button type="button" className="v4-ask is-s" aria-label={t("noticed.talk")} data-tip={t("noticed.talkTip")} onClick={() => talk("otto")}>
              <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                <path d={PRODUCT_ICONS.ask} />
              </svg>
            </button>
          </header>
          <p className="v41-cd-e">{t("noticed.empty", { business })}</p>
        </section>
      </div>
    </div>
  );
}
