"use client";

import { Agent, AGENT_IDS, getAgent, PRODUCT_ICONS, type AgentId } from "@hellosquad/ui";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState, useTransition } from "react";
import {
  correctFactAction,
  decideSuggestionAction,
  factHistoryAction,
  resolveConflictAction,
} from "@/app/app/[workspace]/memory-actions";
import { NeedsStrip, type StripNeed } from "@/components/env/NeedsStrip";
import { useLive } from "@/components/product/live";
import { useShell } from "@/components/product/shell-context";
import type { BrandFactHistory, FactSource, MemoryConflict, MemoryData } from "@/lib/memory";
import {
  AREAS,
  KEY_TOPICS,
  MISSING_ICON,
  STATE_LOOK,
  agentCount,
  dayMonth,
  groupItems,
  hiddenCount,
  keyFact,
  lowerFirst,
  memoryItems,
  memoryLog,
  pendingCards,
  pendingCounts,
  rowActions,
  shortWhen,
  sourceIcon,
  sourceLook,
  tabCount,
  usersOf,
  usesHeading,
  type Filters,
  type LogEntry,
  type MemItem,
  type Pending,
} from "./memory-model";

const PEND_TOP = 3;
const LOG_TOP = 5;

type Edit = { id: string; value: string } | null;

/**
 * Memória da Marca (V4.5 `_vMem5` + V4.6): dossiê, "O squad percebeu", "Alterações recentes" e "Tudo o que o squad
 * sabe", com o mesmo DOM e as mesmas classes do template (L5188–5292). Dados reais da API (S1d); só o owner decide.
 */
export function MemoryView({ data, business, userInitial }: { data: MemoryData; business: string; userInitial: string }) {
  const t = useTranslations("memory");
  const tc = useTranslations("common");
  const locale = useLocale();
  const shell = useShell();
  const live = useLive();
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [filters, setFilters] = useState<Filters>({ area: "all", q: "", agent: null, showHidden: false });
  const [open, setOpen] = useState<string | null>(null);
  const [edit, setEdit] = useState<Edit>(null);
  const [pendMore, setPendMore] = useState(false);
  const [logMore, setLogMore] = useState(false);
  const [history, setHistory] = useState<Record<string, BrandFactHistory>>({});
  const uid = useId();
  const now = useMemo(() => new Date(), []);

  const newIds = useMemo(() => new Set(live.state.memoryNew), [live.state.memoryNew]);
  const items = useMemo(() => memoryItems(data, newIds), [data, newIds]);
  const sources = data.dossier.sources;
  const pending = useMemo(() => pendingCards(items, data.conflicts), [items, data.conflicts]);
  const counts = pendingCounts(items, data.conflicts);
  const log = useMemo(() => memoryLog(data), [data]);
  const groups = groupItems(items, filters);
  const shown = groups.reduce((n, g) => n + g.count, 0);
  const hidden = hiddenCount(items, filters.agent);
  const canDecide = shell.canDecide;
  const everPerceived = data.suggestions.length > 0;

  const when = (iso: string) => shortWhen(iso, now, locale, (time) => t("log.today", { time }));
  const stateLabel = (x: MemItem) => t(`states.${x.state}`);
  const who = (a: AgentId) => getAgent(a).name;
  const withArt = (a: AgentId, upper = false) => {
    const m = getAgent(a);
    const art = upper ? m.article.toUpperCase() : m.article;
    return `${art} ${m.name}`;
  };

  function run(task: () => Promise<{ ok: boolean; message?: string }>, done: string, agent: AgentId = "nexo") {
    startTransition(async () => {
      const result = await task();
      if (!result.ok) {
        shell.toast("message" in result && result.message ? result.message : t("unavailableApi"), agent);
        return;
      }
      setEdit(null);
      shell.toast(done, agent);
      router.refresh();
    });
  }
  const unavailable = () => shell.toast(tc("unavailable"));

  function talk(x: MemItem) {
    const users = x.usedBy.filter((a) => a !== "nexo");
    const agent: AgentId = x.kind === "suggestion" && x.by ? x.by : (users[0] ?? "nexo");
    shell.openConversation({
      conversationId: shell.conversationIds.direct[agent] ?? null,
      agent,
      context: {
        kind: "memory",
        label: x.key,
        href: `/app/${shell.workspace.slug}/memoria-da-marca`,
        meta: t("context.meta", { state: lowerFirst(stateLabel(x)) }),
      },
    });
  }

  function toggleRow(x: MemItem) {
    const next = open === x.id ? null : x.id;
    setOpen(next);
    setEdit(null);
    if (next && x.kind === "fact" && !history[x.id]) {
      void factHistoryAction(x.id).then((r) => {
        if (r.ok) setHistory((h) => ({ ...h, [x.id]: r.data }));
      });
    }
  }

  // Faixa "Precisa de você" da Memória (V4.6 L13815): "N sugestões, N em conflito e N desatualizado" · "Revisar".
  const parts = [
    counts.suggestions ? t("strip.suggestions", { count: counts.suggestions }) : "",
    counts.conflicts ? t("strip.conflicts", { count: counts.conflicts }) : "",
    counts.outdated ? t("strip.outdated", { count: counts.outdated }) : "",
  ].filter(Boolean);
  const stripTitle = parts.length > 1 ? parts.slice(0, -1).join(", ") + t("strip.and") + parts[parts.length - 1] : (parts[0] ?? "");
  const needs: StripNeed[] = parts.length
    ? [
        {
          approvalId: "memory",
          agent: "nexo",
          kind: tc("approvalKinds.confirm"),
          title: stripTitle,
          sub: t("strip.sub"),
          cta: t("strip.cta"),
          href: "#me-pend",
          who: t("strip.who"),
        },
      ]
    : [];

  // ------------------------------------------------------------ dossiê
  const keys = KEY_TOPICS.map((k) => ({ ...k, fact: keyFact(items, k.area, k.topic) }));

  function editor(id: string, onSave: (value: string) => void, saveLabel: string) {
    if (!edit || edit.id !== id) return null;
    return (
      <div className="me-edit">
        <textarea
          className="me-ta"
          rows={2}
          aria-label={t("act.editAria")}
          value={edit.value}
          onChange={(e) => setEdit({ id, value: e.target.value })}
          autoFocus
        />
        <div className="me-edit-a">
          <button
            type="button"
            className="ps-mini is-pri"
            disabled={busy || !edit.value.trim()}
            onClick={() => onSave(edit.value.trim())}
          >
            {saveLabel}
          </button>
          <button type="button" className="ps-mini" onClick={() => setEdit(null)}>
            {t("act.cancel")}
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------ O squad percebeu
  function pendCard(p: Pending) {
    if (p.kind === "suggestion") {
      const x = p.item;
      const by = x.by ?? "nexo";
      const editing = edit?.id === x.id;
      return (
        <article key={x.id} className={"ml-s is-hypo" + (x.isNew ? " is-new" : "")} data-mid={x.id}>
          <div className="ml-s-h">
            <Agent agent={by} size={22} />
            <span className="ml-s-k">{t("pend.kickHypo", { name: who(by), topic: lowerFirst(x.topic) })}</span>
            <span className="ml-s-at">{dayIsToday(x.at) ? t("pend.today") : dayMonth(x.at, locale)}</span>
          </div>
          <p className="ml-s-q">{x.question || `${x.value}?`}</p>
          <p className="ml-s-o">{t("pend.origin", { origin: x.origin || t("sourceKinds.agent_observation") })}</p>
          {editing
            ? editor(x.id, (value) => run(() => decideSuggestionAction(x.id, "correct", value), t("toast.corrected")), t("act.saveConfirmed"))
            : null}
          {!editing ? (
            <div className="ml-s-a">
              {canDecide ? (
                <>
                  <button
                    type="button"
                    className="ps-mini is-pri"
                    disabled={busy}
                    onClick={() => run(() => decideSuggestionAction(x.id, "confirm"), t("toast.confirmed"))}
                  >
                    {t("act.confirm")}
                  </button>
                  <button type="button" className="ps-mini" disabled={busy} onClick={() => setEdit({ id: x.id, value: x.value })}>
                    {t("act.fix")}
                  </button>
                  <button
                    type="button"
                    className="ps-mini is-ghost"
                    disabled={busy}
                    onClick={() => run(() => decideSuggestionAction(x.id, "discard"), t("toast.discarded"))}
                  >
                    {t("act.discard")}
                  </button>
                  <span className="ml-s-n">{t("pend.note")}</span>
                </>
              ) : (
                <span className="ml-s-n">{tc("ownerDecides")}</span>
              )}
            </div>
          ) : null}
        </article>
      );
    }
    if (p.kind === "conflict") return conflictCard(p.conflict);
    const x = p.item;
    return (
      <article key={x.id} className="ml-s is-old" data-mid={x.id}>
        <div className="ml-s-h">
          <Agent agent="iris" size={22} />
          <span className="ml-s-k">{t("pend.kickOld", { key: lowerFirst(x.key) })}</span>
          <span className="ml-s-at">{dayMonth(x.at, locale)}</span>
        </div>
        <p className="ml-s-q">{x.value}</p>
        {x.origin ? <p className="ml-s-o">{x.origin}</p> : null}
        <div className="ml-s-a">
          {canDecide ? (
            <button type="button" className="ps-mini" onClick={unavailable}>
              {t("pend.keepUsing")}
            </button>
          ) : null}
          <span className="ml-s-n">{canDecide ? t("pend.oldNote") : tc("ownerDecides")}</span>
        </div>
      </article>
    );
  }

  function conflictCard(c: MemoryConflict) {
    const editing = edit?.id === c.id;
    const opts = [c.fact_a, c.fact_b];
    return (
      <article key={c.id} className="ml-s is-conf" data-mid={c.id}>
        <div className="ml-s-h">
          <Agent agent="nexo" size={22} />
          <span className="ml-s-k">{t("pend.kickConf", { key: lowerFirst(c.fact_a.key) })}</span>
          <span className="ml-s-at" />
        </div>
        <p className="ml-s-q">{t("pend.confQ", { key: lowerFirst(c.fact_a.key) })}</p>
        <div className="ml-cf">
          {opts.map((f) => {
            const src = sources.find((s) => s.id === f.source_id)?.name ?? t(`sourceKinds.${f.source_type}`);
            return (
              <button
                key={f.id}
                type="button"
                className="ml-cf-o"
                aria-label={t("pend.keepAria", { value: f.content })}
                disabled={!canDecide || busy}
                onClick={() => run(() => resolveConflictAction(c.id, { keepFactId: f.id }), t("toast.resolved"))}
              >
                <span className="ml-cf-src">
                  <svg className="ps-ic" viewBox="0 0 18 18" aria-hidden="true">
                    <path d={sourceIcon(f.source_type, src)} />
                  </svg>
                  <span>{`${src} · ${dayMonth(f.valid_from || f.created_at, locale)}`}</span>
                </span>
                <b>{f.content}</b>
                <span className="ml-cf-go">{t("pend.keep")}</span>
              </button>
            );
          })}
        </div>
        {editing
          ? editor(c.id, (value) => run(() => resolveConflictAction(c.id, { content: value }), t("toast.corrected")), t("act.saveConfirmed"))
          : null}
        {!editing ? (
          <div className="ml-s-a">
            {canDecide ? (
              <button type="button" className="hm-link is-s" onClick={() => setEdit({ id: c.id, value: "" })}>
                <span>{t("pend.neither")}</span>
              </button>
            ) : (
              <span className="ml-s-n">{tc("ownerDecides")}</span>
            )}
          </div>
        ) : null}
      </article>
    );
  }

  // ------------------------------------------------------------ alterações recentes
  function logLine(h: LogEntry, i: number) {
    const value = lowerFirst(h.value);
    const text =
      h.kind === "suggested"
        ? t("log.suggested", { who: withArt(h.who, true), value })
        : h.kind === "resolved"
          ? t("log.resolved", { key: lowerFirst(h.key), value })
          : t(`log.${h.kind}`, { value });
    const target = h.target ? items.find((x) => x.id === h.target) : undefined;
    return (
      <li key={`${h.kind}-${h.at}-${i}`}>
        {h.who ? <Agent agent={h.who} size={20} /> : <span className="me-you" aria-hidden="true">{userInitial}</span>}
        <span className="me-ll-t">
          {target ? (
            <button
              type="button"
              className="me-ll-b"
              onClick={() => {
                setFilters((f) => ({ ...f, area: "all", q: "", agent: null }));
                toggleRow(target);
                requestAnimationFrame(() => document.querySelector(`[data-mid="${target.id}"]`)?.scrollIntoView({ block: "center" }));
              }}
            >
              {text}
            </button>
          ) : (
            <span>{text}</span>
          )}
          <small>{when(h.at)}</small>
        </span>
      </li>
    );
  }

  // ------------------------------------------------------------ linha de "Tudo o que o squad sabe"
  function row(x: MemItem) {
    const isOpen = open === x.id;
    const look = STATE_LOOK[x.state];
    const users = usersOf(x);
    const faces = users.slice(0, 4);
    const srcLabel =
      x.kind === "suggestion"
        ? t("sourceKinds.agent_observation")
        : x.sourceType === "connection" || x.sourceType === "file"
          ? (x.sourceName ?? t(`sourceKinds.${x.sourceType}`))
          : x.sourceType
            ? t(`sourceKinds.${x.sourceType}`)
            : "";
    const did = `${uid}-d-${x.id}`;
    const hist = history[x.id];
    const versions = hist ? [...hist.versions].sort((a, b) => b.version - a.version) : [];
    const prev = versions.find((v) => v.version === x.version - 1);
    const date = dayMonth(x.confirmedAt ?? x.at, locale);
    const line = t(`stateLine.${x.state}`, { date, source: srcLabel });
    const heading = usesHeading(x);
    const acts = rowActions(x);
    const editing = edit?.id === x.id;
    const entered = x.origin || srcLabel;
    return (
      <li key={x.id} className={`me-r${isOpen ? " is-open" : ""} is-${look.k}${x.isNew ? " is-hi" : ""}`} data-mid={x.id}>
        <button
          type="button"
          className="me-r-b"
          aria-expanded={isOpen}
          aria-controls={did}
          aria-label={t("browse.rowAria", {
            key: x.key,
            value: x.value,
            state: stateLabel(x),
            action: isOpen ? t("browse.rowClose") : t("browse.rowOpen"),
          })}
          onClick={() => toggleRow(x)}
        >
          <span className="me-r-k">{x.key}</span>
          <span className="me-r-v">{x.value}</span>
          <span className={`me-st is-${look.k}`}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d={look.icon} />
            </svg>
            <span>{stateLabel(x)}</span>
          </span>
          <span className="me-r-src">
            <svg viewBox="0 0 18 18" aria-hidden="true">
              <path d={x.kind === "suggestion" ? PRODUCT_ICONS.squad : sourceIcon(x.sourceType ?? "onboarding", x.sourceName)} />
            </svg>
            <span>{srcLabel}</span>
          </span>
          <span className="me-r-ags" aria-hidden="true">
            {faces.map((a) => (
              <Agent key={a} agent={a} size={18} />
            ))}
            {users.length > 4 ? <i>{`+${users.length - 4}`}</i> : null}
          </span>
          <svg className="sb-ic me-r-chev" viewBox="0 0 18 18" aria-hidden="true">
            <path d={PRODUCT_ICONS.chev} />
          </svg>
        </button>
        {isOpen ? (
          <div className="me-d" id={did}>
            <div className="me-d-c">
              <span className="ka-k">{t("browse.origin")}</span>
              <p className="me-d-o">{x.origin || srcLabel}</p>
              <p className="me-d-cf">{line}</p>
              {prev ? <p className="me-d-prev">{t("browse.prev", { value: prev.content })}</p> : null}
              <span className="ka-k">{t("browse.changes")}</span>
              <ol className="me-d-h">
                {versions
                  .filter((v) => v.version > 1)
                  .map((v) => (
                    <li key={v.id}>
                      <span className="me-you is-s" aria-hidden="true">
                        {userInitial}
                      </span>
                      <span>{t("log.corrected", { value: lowerFirst(v.content) })}</span>
                      <small>{when(v.created_at)}</small>
                    </li>
                  ))}
                <li>
                  {x.kind === "suggestion" && x.by ? (
                    <Agent agent={x.by} size={16} />
                  ) : (
                    <span className="me-you is-s" aria-hidden="true">
                      {userInitial}
                    </span>
                  )}
                  <span>{t("browse.entered", { origin: lowerFirst(entered) })}</span>
                  <small>{dayMonth(versions.at(-1)?.valid_from ?? x.at, locale)}</small>
                </li>
              </ol>
            </div>
            <div className="me-d-c">
              <span className="ka-k">{t(`browse.${heading}`)}</span>
              {users.length >= AGENT_IDS.length ? (
                <div className="me-d-all">
                  <span className="me-faces" aria-hidden="true">
                    {AGENT_IDS.map((a) => (
                      <Agent key={a} agent={a} size={20} outline />
                    ))}
                  </span>
                  <small>{t("browse.usesAll")}</small>
                </div>
              ) : null}
              <ul className="me-d-u">
                {users.length < AGENT_IDS.length
                  ? users.map((a) => (
                      <li key={a}>
                        <Agent agent={a} size={22} />
                        <span>
                          <b>{t("browse.agentRole", { name: who(a), role: t(`roles.${a}`) })}</b>
                        </span>
                      </li>
                    ))
                  : null}
              </ul>
            </div>
            <div className="me-d-a">
              {editing
                ? editor(
                    x.id,
                    (value) =>
                      run(
                        () =>
                          x.kind === "suggestion"
                            ? decideSuggestionAction(x.id, "correct", value)
                            : correctFactAction(x.id, value),
                        t("toast.corrected"),
                      ),
                    t("act.save"),
                  )
                : null}
              {!editing ? (
                <>
                  {canDecide && acts.confirm ? (
                    <button
                      type="button"
                      className="ps-mini is-pri"
                      disabled={busy}
                      onClick={() =>
                        x.kind === "suggestion"
                          ? run(() => decideSuggestionAction(x.id, "confirm"), t("toast.confirmed"))
                          : unavailable()
                      }
                    >
                      {t("act.confirm")}
                    </button>
                  ) : null}
                  {canDecide && acts.fix ? (
                    <button type="button" className="ps-mini" disabled={busy} onClick={() => setEdit({ id: x.id, value: x.value })}>
                      {t("act.fix")}
                    </button>
                  ) : null}
                  {canDecide && acts.discard ? (
                    <button
                      type="button"
                      className="ps-mini is-ghost"
                      disabled={busy}
                      onClick={() => run(() => decideSuggestionAction(x.id, "discard"), t("toast.discarded"))}
                    >
                      {t("act.discard")}
                    </button>
                  ) : null}
                  {canDecide && acts.off ? (
                    <button type="button" className="ps-mini is-ghost" onClick={unavailable}>
                      {t("act.off")}
                    </button>
                  ) : null}
                  {canDecide && acts.on ? (
                    <button type="button" className="ps-mini" onClick={unavailable}>
                      {t("act.on")}
                    </button>
                  ) : null}
                  {!canDecide ? <span className="ml-s-n">{tc("ownerDecides")}</span> : null}
                  <button type="button" className="hm-link is-s" onClick={() => talk(x)}>
                    <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                      <path d={PRODUCT_ICONS.ask} />
                    </svg>
                    <span>{t("act.talk")}</span>
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </li>
    );
  }

  function dayIsToday(iso: string) {
    return dayMonth(iso, locale) === dayMonth(now.toISOString(), locale);
  }

  const pendTop = pending.slice(0, PEND_TOP);
  const pendRest = pending.slice(PEND_TOP);
  const logTop = log.slice(0, LOG_TOP);
  const logRest = log.slice(LOG_TOP);
  const tabs: Array<{ id: Filters["area"]; label: string }> = [
    { id: "all", label: t("browse.all") },
    ...AREAS.map((a) => ({ id: a, label: t(`areas.${a}`) })),
    { id: "sources", label: t("browse.sources") },
  ];
  const q = filters.q.trim();

  return (
    <div
      className={"ps-v is-wide v4 me" + (shell.layout.contentW < 1040 ? " is-nar" : "") + (shell.layout.contentW < 820 ? " is-tight" : "")}
      style={{ maxWidth: shell.layout.contentW }}
    >
      <header className="v4-id me-id">
        <span className="v4-id-av me-ico" aria-hidden="true">
          <svg className="sb-ic" viewBox="0 0 18 18">
            <path d={PRODUCT_ICONS.mem} />
          </svg>
        </span>
        <div className="v4-id-t">
          <h1 className="v4-h1">{t("title")}</h1>
          <p className="v4-id-d">{t("sub")}</p>
        </div>
        <label className="me-q">
          <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
            <path d={PRODUCT_ICONS.search} />
          </svg>
          <input
            type="search"
            className="me-q-i"
            placeholder={t("search")}
            aria-label={t("search")}
            value={filters.q}
            onChange={(e) => {
              const value = e.target.value;
              setFilters((f) => ({ ...f, q: value, area: f.area === "sources" ? "all" : f.area }));
              setOpen(null);
            }}
          />
        </label>
        <button type="button" className="hm-btn is-dark is-s me-add-b" aria-expanded={false} onClick={unavailable}>
          <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
            <path d={PRODUCT_ICONS.plus} />
          </svg>
          <span>{t("add")}</span>
        </button>
      </header>

      <NeedsStrip items={needs} tight />

      <section className="me-dos" aria-labelledby="me-dos-t">
        <div className="me-dos-a">
          <div className="me-brand">
            <span className="me-badge" aria-hidden="true">
              {data.dossier.brand_name.trim().charAt(0).toUpperCase()}
            </span>
            <span className="me-brand-t">
              <b id="me-dos-t">{data.dossier.brand_name}</b>
            </span>
          </div>
          <span className="ka-k">{t("dossier.know")}</span>
          <p className="me-sum">{t("dossier.sumFirst", { business })}</p>
          <div className="me-fs" role="group" aria-label={t("dossier.fromAria")}>
            <span className="ka-k">{t("dossier.from")}</span>
            {sources.map((s) => (
              <SourcePill
                key={s.id}
                source={s}
                label={sourceShort(s, t)}
                aria={t("dossier.pillAria", { name: s.name, state: t(`sourceStates.${s.state}`) })}
                onGo={() => {
                  setFilters((f) => ({ ...f, area: "sources", q: "" }));
                  setOpen(null);
                  requestAnimationFrame(() => document.getElementById("me-br-t")?.scrollIntoView({ block: "start" }));
                }}
              />
            ))}
          </div>
          <div className="me-dos-f">
            <span className="me-faces" aria-hidden="true">
              {AGENT_IDS.map((a) => (
                <Agent key={a} agent={a} size={20} outline />
              ))}
            </span>
            <small>{t("dossier.footFirst")}</small>
          </div>
        </div>
        <div className="me-dos-b">
          <span className="ka-k">{t("dossier.keys")}</span>
          <ul className="me-keys">
            {keys.map((k) => {
              const label = t(`dossier.key.${k.key}`);
              const fact = k.fact;
              const look = fact ? STATE_LOOK[fact.state] : null;
              return (
                <li key={k.key}>
                  <button
                    type="button"
                    className={fact ? "me-key" : "me-key is-miss"}
                    aria-label={fact ? t("dossier.keyAria", { key: label, value: fact.value }) : t("dossier.keyMissAria", { key: label })}
                    onClick={() => {
                      if (!fact) return unavailable();
                      setFilters((f) => ({ ...f, area: "all", q: "", agent: null }));
                      toggleRow(fact);
                      requestAnimationFrame(() => document.querySelector(`[data-mid="${fact.id}"]`)?.scrollIntoView({ block: "center" }));
                    }}
                  >
                    <span className="me-key-l">{label}</span>
                    <span className="me-key-v">{fact ? fact.value : t("dossier.keyMiss")}</span>
                    <span
                      className={fact && look ? `me-st is-${look.k}` : "me-st is-miss"}
                      title={fact ? stateLabel(fact) : t("states.suggested")}
                    >
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path d={look ? look.icon : MISSING_ICON} />
                      </svg>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div className="me-g2" id="me-pend">
        <section className="me-pend" aria-labelledby="me-pend-t">
          <header className="bi-sh">
            <h2 id="me-pend-t">{t("pend.title")}</h2>
            <small>{t("pend.sub")}</small>
          </header>
          {pending.length ? (
            <>
              <div className="ml-l">{pendTop.map(pendCard)}</div>
              {pendRest.length ? (
                <>
                  <div className={"v41-more" + (pendMore ? " is-open" : "")} id={`${uid}-pend`}>
                    <div className="v41-more-in">
                      <div className="ml-l">{pendRest.map(pendCard)}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="v41-xbtn"
                    aria-expanded={pendMore}
                    aria-controls={`${uid}-pend`}
                    onClick={() => setPendMore((v) => !v)}
                  >
                    <span>{pendMore ? t("pend.less") : t("pend.more", { count: pendRest.length })}</span>
                    <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                      <path d={PRODUCT_ICONS.chev} />
                    </svg>
                  </button>
                </>
              ) : null}
            </>
          ) : (
            <p className="me-none">{everPerceived ? t("pend.none") : t("pend.noneFirst")}</p>
          )}
        </section>
        <aside className="me-log" aria-labelledby="me-log-t">
          <header className="bi-sh">
            <h2 id="me-log-t">{t("log.title")}</h2>
          </header>
          {log.length ? (
            <>
              <ol className="me-ll">{logTop.map(logLine)}</ol>
              {logRest.length ? (
                <>
                  <div className={"v41-more" + (logMore ? " is-open" : "")} id={`${uid}-log`}>
                    <div className="v41-more-in">
                      <ol className="me-ll">{logRest.map((h, i) => logLine(h, i + LOG_TOP))}</ol>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="v41-xbtn"
                    aria-expanded={logMore}
                    aria-controls={`${uid}-log`}
                    onClick={() => setLogMore((v) => !v)}
                  >
                    <span>{logMore ? t("pend.less") : t("log.more", { count: log.length })}</span>
                    <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                      <path d={PRODUCT_ICONS.chev} />
                    </svg>
                  </button>
                </>
              ) : null}
            </>
          ) : (
            <p className="me-none">{t("log.none")}</p>
          )}
        </aside>
      </div>

      <section className="me-br" aria-labelledby="me-br-t">
        <header className="me-br-h">
          <div className="bi-sh">
            <h2 id="me-br-t">{t("browse.title")}</h2>
            <small>{t("browse.sub")}</small>
          </div>
          <div className="me-agfs" role="group" aria-label={t("browse.byAgentAria")}>
            <span className="me-agfs-l">{t("browse.byAgent")}</span>
            {AGENT_IDS.map((a) => {
              const on = filters.agent === a;
              const aria = t("browse.agentAria", { who: withArt(a) });
              return (
                <button
                  key={a}
                  type="button"
                  className={"me-agf" + (on ? " is-on" : "")}
                  aria-pressed={on}
                  aria-label={aria}
                  title={aria}
                  onClick={() => {
                    setFilters((f) => ({ ...f, agent: on ? null : a }));
                    setOpen(null);
                  }}
                >
                  <Agent agent={a} size={24} />
                </button>
              );
            })}
          </div>
        </header>
        <div className="me-tabs" role="group" aria-label={t("browse.tabsAria")}>
          {tabs.map((tab) => {
            const on = filters.area === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={"me-tab" + (on ? " is-on" : "")}
                aria-pressed={on}
                onClick={() => {
                  setFilters((f) => ({ ...f, area: tab.id }));
                  setOpen(null);
                  setEdit(null);
                }}
              >
                <span>{tab.label}</span>
                <i>{tabCount(items, tab.id, sources.length)}</i>
              </button>
            );
          })}
        </div>
        {q ? (
          <p className="me-ql">
            <span>{t("browse.results", { count: shown, q: filters.q })}</span>
            <button type="button" className="hm-link is-s" onClick={() => setFilters((f) => ({ ...f, q: "" }))}>
              <span>{t("browse.clear")}</span>
            </button>
          </p>
        ) : null}
        {filters.agent ? (
          <div className="me-agb">
            <Agent agent={filters.agent} size={36} />
            <span className="me-agb-t">
              <b>{t("browse.agentTitle", { who: withArt(filters.agent, true), count: agentCount(items, filters.agent) })}</b>
              <small>{t("browse.agentSub", { uses: t(`uses.${filters.agent}`) })}</small>
            </span>
            <button type="button" className="hm-link is-s" onClick={() => setFilters((f) => ({ ...f, agent: null }))}>
              <span>{t("browse.seeAll")}</span>
            </button>
          </div>
        ) : null}
        {filters.area !== "sources" ? (
          <>
            {groups.map((g) => (
              <div key={g.area} className="me-grp">
                {filters.area === "all" ? (
                  <h3 className="me-grp-h">
                    {t(`areas.${g.area}`)}
                    <small>{t(`areaDesc.${g.area}`)}</small>
                  </h3>
                ) : null}
                {g.topics.map((tp) => (
                  <div key={tp.topic} className="me-tp">
                    <span className="me-tp-k">{tp.topic}</span>
                    <ul className="me-rl">{tp.rows.map(row)}</ul>
                  </div>
                ))}
              </div>
            ))}
            {groups.length === 0 ? <p className="me-none">{q ? t("browse.emptyQ") : t("browse.empty")}</p> : null}
            {hidden > 0 ? (
              <button
                type="button"
                className="hm-link is-s me-hid"
                onClick={() => setFilters((f) => ({ ...f, showHidden: !f.showHidden }))}
              >
                <span>{filters.showHidden ? t("browse.hideHidden") : t("browse.showHidden", { count: hidden })}</span>
              </button>
            ) : null}
          </>
        ) : (
          <ul className="me-sl">
            {sources.map((s) => (
              <li key={s.id} className={`me-src is-${sourceLook(s.state)}`}>
                <span className="me-src-ic" aria-hidden="true">
                  <svg className="sb-ic" viewBox="0 0 18 18">
                    <path d={sourceIcon(s.kind, s.name)} />
                  </svg>
                </span>
                <span className="me-src-t">
                  <b>{s.name}</b>
                  {s.last_sync_at ? <small>{dayMonth(s.last_sync_at, locale)}</small> : null}
                </span>
                <span className="me-src-m">{s.permissions.join(" · ")}</span>
                <span className="me-src-st">
                  <i aria-hidden="true" />
                  <span>{t(`sourceStates.${s.state}`)}</span>
                </span>
                <span className="me-src-n">{s.fact_count ? t("browse.factCount", { count: s.fact_count }) : ""}</span>
                <span className="me-src-a" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function sourceShort(s: FactSource, t: ReturnType<typeof useTranslations<"memory">>): string {
  if (s.kind === "connection") return s.name;
  if (s.kind === "file") return s.name || t("sourceShort.file");
  return t(`sourceShort.${s.kind}`);
}

function SourcePill({ source, label, aria, onGo }: { source: FactSource; label: string; aria: string; onGo: () => void }) {
  return (
    <button type="button" className={`me-fp is-${sourceLook(source.state)}`} onClick={onGo} aria-label={aria}>
      <svg className="ps-ic" viewBox="0 0 18 18" aria-hidden="true">
        <path d={sourceIcon(source.kind, source.name)} />
      </svg>
      <span>{label}</span>
      <i aria-hidden="true" />
    </button>
  );
}
