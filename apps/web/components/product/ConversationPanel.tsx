"use client";

import { Agent, CommandField, getAgent, Icon, PRODUCT_ICONS, SQUAD, type AgentId } from "@hellosquad/ui";
import type { components } from "@hellosquad/contracts";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  createDirectConversationAction,
  loadConversationAction,
  loadOlderMessagesAction,
  sendMessageAction,
} from "@/app/app/[workspace]/actions";
import { dayKey, dayLabel, shortTime, threadAt, threadTitleFrom } from "./conversation-format";
import { usePopoverDismiss } from "./Popover";
import { useShell, type ConversationTarget } from "./shell-context";

type Message = components["schemas"]["Message"];

export type ConversationActions = {
  load: typeof loadConversationAction;
  older: typeof loadOlderMessagesAction;
  send: typeof sendMessageAction;
  create: typeof createDirectConversationAction;
};

const DEFAULT_ACTIONS: ConversationActions = {
  load: loadConversationAction,
  older: loadOlderMessagesAction,
  send: sendMessageAction,
  create: createDirectConversationAction,
};

/** Perto do topo (px), a rolagem traz as mensagens anteriores (`before=`). */
const OLDER_AT = 48;

type Loaded = { key: string; messages: Message[]; older: string | null; error: boolean };

function targetKey(target: ConversationTarget | null): string {
  if (!target) return "";
  return `${target.conversationId ?? "nova"}:${target.agent ?? "squad"}:${target.context?.label ?? ""}`;
}

/**
 * Painel de conversa universal da V4.6: o mesmo em todos os ambientes (380 px a partir de 1360, 364 abaixo,
 * por cima nos pilotos apertados), com o objeto da conversa no cabeçalho. Esc fecha e devolve o foco.
 * Abre pelas mensagens mais recentes e traz as anteriores ao subir; a conversa direta tem o seletor
 * "Conversas" com o histórico do especialista e "Nova conversa" (dono, 16/10 08:55).
 */
export function ConversationPanel({ actions = DEFAULT_ACTIONS, now }: { actions?: ConversationActions; now?: Date }) {
  const t = useTranslations("conversation");
  const tc = useTranslations("common");
  const locale = useLocale();
  const shell = useShell();
  const { mode, target } = shell.conversation;
  const open = mode !== "off" && !!target;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [threadsOpen, setThreadsOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const section = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const keep = useRef<{ height: number; top: number } | null>(null);
  const threadsBtn = useRef<HTMLButtonElement>(null);
  const threadsPop = useRef<HTMLDivElement>(null);
  const key = targetKey(target);
  const lastWidth = useRef(shell.layout.panelW);
  if (shell.layout.convW) lastWidth.current = shell.layout.convW;
  usePopoverDismiss(threadsOpen, () => setThreadsOpen(false), threadsBtn, threadsPop);

  // Abriu: guarda quem abriu (o foco volta para ele) e leva o foco ao campo. Trocar de conversa pelo
  // seletor não troca quem abriu.
  useEffect(() => {
    if (!open) return;
    const active = document.activeElement as HTMLElement | null;
    if (!section.current?.contains(active)) opener.current = active;
    const id = requestAnimationFrame(() => section.current?.querySelector<HTMLElement>("textarea, input")?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, key]);

  // Reabrir sobre o mesmo objeto retoma o histórico: a última página de mensagens vem da API (só leitura).
  useEffect(() => {
    if (!open || !target) return;
    if (!target.conversationId) {
      setLoaded((prev) => (prev?.key === key ? prev : { key, messages: [], older: null, error: false }));
      return;
    }
    let alive = true;
    setLoaded((prev) => (prev?.key === key ? prev : null));
    actions.load(target.conversationId).then((result) => {
      if (!alive) return;
      setLoaded(
        result.ok
          ? { key, messages: result.data.messages, older: result.data.older, error: false }
          : { key, messages: [], older: null, error: true },
      );
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- o alvo é identificado pela chave (key)
  }, [open, key, actions]);

  // Abre pelo fim (as mais recentes); ao trazer as anteriores, mantém o ponto de leitura.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const kept = keep.current;
    keep.current = null;
    el.scrollTop = kept ? el.scrollHeight - kept.height + kept.top : el.scrollHeight;
  }, [loaded]);

  async function loadOlder() {
    const from = loaded;
    if (!target?.conversationId || !from || from.key !== key || !from.older || loadingOlder) return;
    setLoadingOlder(true);
    const result = await actions.older(target.conversationId, from.older);
    setLoadingOlder(false);
    if (!result.ok) return;
    const el = scroller.current;
    if (el) keep.current = { height: el.scrollHeight, top: el.scrollTop };
    setLoaded((prev) => {
      if (!prev || prev.key !== from.key) return prev;
      const seen = new Set(prev.messages.map((m) => m.id));
      return { ...prev, messages: [...result.data.messages.filter((m) => !seen.has(m.id)), ...prev.messages], older: result.data.older };
    });
  }

  // Página que não enche a coluna não tem como rolar: traz as anteriores até encher (ou chegar ao começo).
  useEffect(() => {
    const el = scroller.current;
    if (el && loaded?.key === key && loaded.older && el.scrollHeight - el.clientHeight <= OLDER_AT) void loadOlder();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reage a cada página nova
  }, [loaded]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector(".ps-pop")) return;
      shell.closeConversation();
      const back = opener.current;
      requestAnimationFrame(() => back?.focus());
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, shell]);

  useEffect(() => {
    if (threadsOpen) threadsPop.current?.querySelector<HTMLElement>(".is-on, [role=menuitem]")?.focus();
  }, [threadsOpen]);

  const baseCls = "ps-conv" + (mode === "full" ? " is-full" : mode === "panel" ? " is-panel" : " is-off");
  if (!open || !target) {
    return <section className={baseCls} style={{ width: 0 }} aria-label={t("label")} aria-hidden="true" />;
  }

  const room = !!target.room;
  const agent = target.agent ? getAgent(target.agent) : null;
  const nexo = getAgent("nexo");
  const title = room ? t("roomTitle") : (agent?.name ?? "");
  const messages = loaded?.key === key ? loaded.messages : [];
  const agentSpoke = messages.some((m) => m.author_type === "agent");
  const suggestions: string[] =
    !room && target.agent && !agentSpoke && ["nexo", "otto", "iris"].includes(target.agent)
      ? (t.raw(`suggestions.${target.agent as "nexo" | "otto" | "iris"}`) as string[])
      : [];
  const placeholder = room
    ? t("placeholderRoom")
    : t("placeholder", { to: tc("agentTo", { article: agent?.article ?? "o", name: agent?.name ?? "" }) });
  const sameMode = mode === "full" ? "full" : "panel";
  const today = now ?? new Date();

  // Seletor "Conversas" da V4.6: só na conversa direta (sem objeto); lista as conversas com o mesmo especialista.
  const direct = !room && !!agent && !target.context;
  const threads = agent ? (shell.directThreads[agent.id] ?? []) : [];
  const withAgent = agent ? tc("agentWith", { article: agent.article, name: agent.name }) : "";
  const untitled = t("threadUntitled", { with: withAgent });
  const current = target.conversationId ? threads.find((x) => x.id === target.conversationId) : undefined;
  const threadLabel = target.conversationId ? current?.title || untitled : t("newThread");
  const threadItems: Array<{ id: string | null; title: string; at: string }> = [
    ...(target.conversationId ? [] : [{ id: null, title: t("newThread"), at: t("now") }]),
    ...(target.conversationId && !current ? [{ id: target.conversationId, title: untitled, at: "" }] : []),
    ...threads.map((x) => ({ id: x.id, title: x.title || untitled, at: threadAt(x.at, today, locale) })),
  ];

  function pickThread(id: string | null) {
    setThreadsOpen(false);
    if (!agent || id === (target?.conversationId ?? null)) return;
    shell.openConversation({ conversationId: id, agent: agent.id, fresh: id === null }, sameMode);
  }

  // "Nova conversa" cria um diálogo novo: rascunho até a primeira mensagem (a API cria sempre uma conversa nova).
  function newThread() {
    setThreadsOpen(false);
    if (!agent) return;
    setInput("");
    setSendError(false);
    shell.openConversation({ conversationId: null, agent: agent.id, fresh: true }, sameMode);
    requestAnimationFrame(() => section.current?.querySelector<HTMLElement>("textarea, input")?.focus());
  }

  function onMenuKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>("[role=menuitem]")];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (at + step + items.length) % items.length;
    items[next]?.focus();
  }

  async function send(body: string) {
    if (!target || sending) return;
    setSending(true);
    setSendError(false);
    let conversationId = target.conversationId;
    let created: string | null = null;
    if (!conversationId && target.agent) {
      const made = await actions.create(shell.workspace.id, target.agent, threadTitleFrom(body));
      if (made.ok) conversationId = created = made.data.id;
    }
    if (!conversationId) {
      setSending(false);
      setSendError(true);
      return;
    }
    const result = await actions.send(conversationId, body);
    setSending(false);
    if (result.ok) setInput("");
    else setSendError(true);
    if (created && target.agent) {
      // A conversa passou a existir: entra no topo do histórico do especialista e o painel segue nela.
      const next: ConversationTarget = { conversationId: created, agent: target.agent, context: target.context };
      shell.rememberThread(target.agent, {
        id: created,
        title: threadTitleFrom(body),
        at: result.ok ? result.data.created_at : new Date().toISOString(),
      });
      setLoaded({ key: targetKey(next), messages: result.ok ? [...messages, result.data] : messages, older: null, error: false });
      shell.openConversation(next, sameMode);
      return;
    }
    if (result.ok) {
      setLoaded((prev) => (prev && prev.key === key ? { ...prev, messages: [...prev.messages, result.data] } : prev));
    }
  }

  const cls = baseCls + (suggestions.length ? " has-sug" : "");
  let lastDay = "";

  return (
    <section ref={section} className={cls} style={{ width: shell.layout.convW }} aria-label={t("label")}>
      <div className="ps-cv-in" style={{ width: lastWidth.current }}>
        <header className="ps-cvh">
          <div className="ps-cvh-who">
            {room ? (
              <div className="ps-cvh-room" aria-hidden="true">
                {SQUAD.map((m) => (
                  <Agent key={m.id} agent={m.id} size={26} />
                ))}
              </div>
            ) : agent ? (
              <span className="ps-cvh-av">
                <Agent agent={agent.id} size={40} />
              </span>
            ) : null}
            <div className="ps-cvh-t">
              <div className="ps-cvh-n">
                <b>{title}</b>
                {agent && !room ? <span className="ps-cvh-r">{tc(`areas.${agent.id}`)}</span> : null}
              </div>
              <div className="ps-cvh-s">
                {target.context ? (
                  <span className="cx-sub">
                    <span className="cx-sub-k">{t("about")}</span>
                    {target.context.href ? (
                      <Link
                        href={target.context.href}
                        className="cx-sub-v"
                        aria-label={`${t("openContext", { name: target.context.label })}: ${target.context.label}`}
                        title={t("openContext", { name: target.context.label })}
                      >
                        <span className="cx-sub-n">{target.context.label}</span>
                        <svg className="cx-sub-i" viewBox="0 0 18 18" aria-hidden="true">
                          <path d={PRODUCT_ICONS.out} />
                        </svg>
                      </Link>
                    ) : (
                      <span className="cx-sub-v">
                        <span className="cx-sub-n">{target.context.label}</span>
                      </span>
                    )}
                  </span>
                ) : direct ? (
                  <span className="ps-thw">
                    <button
                      ref={threadsBtn}
                      type="button"
                      className="ps-thb"
                      aria-haspopup="menu"
                      aria-expanded={threadsOpen}
                      onClick={() => setThreadsOpen((v) => !v)}
                    >
                      <span>{threadLabel}</span>
                      <Icon name="chev" size={14} strokeWidth={2.2} />
                    </button>
                    {threadsOpen ? (
                      <div
                        ref={threadsPop}
                        className="ps-pop ps-pop-thr"
                        role="menu"
                        aria-label={t("threadsH", { with: withAgent })}
                        onKeyDown={onMenuKey}
                      >
                        <div className="ps-pop-h">{t("threadsH", { with: withAgent })}</div>
                        {threadItems.map((x) => (
                          <button
                            key={x.id ?? "nova"}
                            type="button"
                            role="menuitem"
                            className={"ps-mi2" + (x.id === target.conversationId ? " is-on" : "")}
                            aria-current={x.id === target.conversationId ? "true" : undefined}
                            onClick={() => pickThread(x.id)}
                          >
                            <span>{x.title}</span>
                            <i>{x.at}</i>
                          </button>
                        ))}
                        <button type="button" role="menuitem" className="ps-mi2 is-new" onClick={newThread}>
                          <svg className="ps-ic" viewBox="0 0 18 18" aria-hidden="true">
                            <path d={PRODUCT_ICONS.plus} />
                          </svg>
                          <span>{t("newThread")}</span>
                        </button>
                      </div>
                    ) : null}
                  </span>
                ) : room ? (
                  <span className="ps-cvh-st">
                    <span>{t("roomStatus")}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="ps-cvh-a">
            {mode === "panel" ? (
              <button
                type="button"
                className="ps-iconbtn"
                aria-label={t("expand")}
                title={t("expandTip")}
                onClick={() => shell.openConversation(target, "full")}
              >
                <svg className="ps-ic" viewBox="0 0 18 18" aria-hidden="true">
                  <path d={PRODUCT_ICONS.expand} />
                </svg>
              </button>
            ) : room ? null : (
              <button
                type="button"
                className="ps-iconbtn"
                aria-label={t("collapse")}
                title={t("collapseTip")}
                onClick={() => shell.openConversation(target, "panel")}
              >
                <svg className="ps-ic" viewBox="0 0 18 18" aria-hidden="true">
                  <path d={PRODUCT_ICONS.collapse} />
                </svg>
              </button>
            )}
            <button
              type="button"
              className="ps-iconbtn"
              aria-label={t("close")}
              title={t("closeTip")}
              onClick={() => {
                const back = opener.current;
                shell.closeConversation();
                requestAnimationFrame(() => back?.focus());
              }}
            >
              <Icon name="close" size={18} strokeWidth={2} />
            </button>
          </div>
        </header>
        <div className="ps-cv-body">
          <div
            className="ps-msgs"
            aria-live="polite"
            aria-busy={loadingOlder || undefined}
            ref={scroller}
            onScroll={(event) => {
              if (event.currentTarget.scrollTop <= OLDER_AT) void loadOlder();
            }}
          >
            <div className="ps-msgs-in">
              {loaded === null || loaded.key !== key ? (
                <div className="ps-typing">
                  <Agent agent={target.agent ?? "nexo"} size={28} thinking />
                  <span>{t("loading")}</span>
                  <span className="ps-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              ) : loaded.error ? (
                <div className="ps-sys">
                  <span>{t("loadError")}</span>
                </div>
              ) : null}
              {messages.map((m) => {
                const day = dayKey(m.created_at);
                const sep =
                  day !== lastDay ? (
                    <div className="ps-day" key={`d-${day}`}>
                      <span>{dayLabel(m.created_at, today, locale, { today: t("today"), yesterday: t("yesterday") })}</span>
                    </div>
                  ) : null;
                lastDay = day;
                const at = shortTime(m.created_at, locale);
                if (m.author_type === "user") {
                  return [
                    sep,
                    <div className="ps-msg-u" key={m.id}>
                      <div className="ps-bub">{m.body}</div>
                      <small>{at}</small>
                    </div>,
                  ];
                }
                if (m.author_type === "agent" && m.author_agent_id) {
                  const who = getAgent(m.author_agent_id as AgentId);
                  return [
                    sep,
                    <div className="ps-msg" key={m.id}>
                      <div className="ps-msg-av">
                        <Agent agent={who.id} size={32} />
                      </div>
                      <div className="ps-msg-b">
                        <div className="ps-msg-n">
                          <b>{who.name}</b>
                          <span className="ps-msg-r">{tc(`areas.${who.id}`)}</span>
                          <i>{at}</i>
                        </div>
                        <div className="ps-msg-t">{m.body}</div>
                      </div>
                    </div>,
                  ];
                }
                return [
                  sep,
                  <div className="ps-sys" key={m.id}>
                    <span>{m.body}</span>
                  </div>,
                ];
              })}
              {suggestions.length && agent ? (
                <div className="cx-sug" role="group" aria-label={t("ask", { article: agent.article, name: agent.name })}>
                  <span className="cx-sug-k">{t("ask", { article: agent.article, name: agent.name })}</span>
                  {suggestions.map((q) => (
                    <button key={q} type="button" className="cx-sg" onClick={() => setInput(q)}>
                      <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                        <path d={PRODUCT_ICONS.ask} />
                      </svg>
                      <span className="cx-sg-t">
                        <b>{q}</b>
                      </span>
                      <svg className="sb-ic cx-sg-a" viewBox="0 0 18 18" aria-hidden="true">
                        <path d={PRODUCT_ICONS.chevR} />
                      </svg>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <footer className="ps-cv-comp">
          <div className="ps-cfield">
            <div className="ps-attw">
              <button type="button" className="ps-attb" aria-label={t("attach")} title={t("attach")} onClick={() => shell.toast(tc("unavailable"))}>
                <svg className="ps-ic" viewBox="0 0 18 18" aria-hidden="true">
                  <path d={PRODUCT_ICONS.clip} />
                </svg>
              </button>
            </div>
            {agent || room ? (
              <div className="cap-cw">
                <button
                  type="button"
                  className="ps-attb cap-cb"
                  aria-label={t("capAria", { article: (agent ?? nexo).article, name: (agent ?? nexo).name })}
                  title={t("capAria", { article: (agent ?? nexo).article, name: (agent ?? nexo).name })}
                  aria-expanded={false}
                  onClick={() => shell.toast(tc("unavailable"), (agent ?? nexo).id)}
                >
                  <svg className="ps-ic" viewBox="0 0 18 18" aria-hidden="true">
                    <path d={PRODUCT_ICONS.capa} />
                  </svg>
                </button>
              </div>
            ) : null}
            <CommandField
              value={input}
              onChange={setInput}
              onSend={send}
              placeholder={placeholder}
              label={placeholder}
              sending={sending}
            />
          </div>
          <div className="ps-cv-hint" aria-live="polite">
            <span>{sendError ? t("sendError") : sending ? t("sending") : room ? t("roomHint") : ""}</span>
          </div>
        </footer>
      </div>
    </section>
  );
}
