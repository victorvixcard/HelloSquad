"use client";

import { Agent, CommandField, getAgent, Icon, PRODUCT_ICONS, SQUAD, type AgentId } from "@hellosquad/ui";
import type { components } from "@hellosquad/contracts";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createDirectConversationAction, loadConversationAction, sendMessageAction } from "@/app/app/[workspace]/actions";
import { dayKey, dayLabel, shortTime } from "./conversation-format";
import { useShell, type ConversationTarget } from "./shell-context";

type Message = components["schemas"]["Message"];

export type ConversationActions = {
  load: typeof loadConversationAction;
  send: typeof sendMessageAction;
  create: typeof createDirectConversationAction;
};

const DEFAULT_ACTIONS: ConversationActions = {
  load: loadConversationAction,
  send: sendMessageAction,
  create: createDirectConversationAction,
};

type Loaded = { key: string; messages: Message[]; error: boolean };

function targetKey(target: ConversationTarget | null): string {
  if (!target) return "";
  return `${target.conversationId ?? "nova"}:${target.agent ?? "squad"}:${target.context?.label ?? ""}`;
}

/**
 * Painel de conversa universal da V4.6: o mesmo em todos os ambientes (380 px a partir de 1360, 364 abaixo,
 * por cima nos pilotos apertados), com o objeto da conversa no cabeçalho. Esc fecha e devolve o foco.
 */
export function ConversationPanel({ actions = DEFAULT_ACTIONS, now }: { actions?: ConversationActions; now?: Date }) {
  const t = useTranslations("conversation");
  const tc = useTranslations("common");
  const locale = useLocale();
  const shell = useShell();
  const { mode, target } = shell.conversation;
  const open = mode !== "off" && !!target;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [createdId, setCreatedId] = useState<{ key: string; id: string } | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const section = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const key = targetKey(target);
  const lastWidth = useRef(shell.layout.panelW);
  if (shell.layout.convW) lastWidth.current = shell.layout.convW;

  // Abriu: guarda quem abriu (o foco volta para ele) e leva o foco ao campo.
  useEffect(() => {
    if (!open) return;
    opener.current = (document.activeElement as HTMLElement | null) ?? null;
    const id = requestAnimationFrame(() => section.current?.querySelector<HTMLElement>("textarea, input")?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, key]);

  // Reabrir sobre o mesmo objeto retoma o histórico: as mensagens vêm da API (só leitura).
  useEffect(() => {
    if (!open || !target) return;
    if (!target.conversationId) {
      setLoaded({ key, messages: [], error: false });
      return;
    }
    let alive = true;
    setLoaded((prev) => (prev?.key === key ? prev : null));
    actions.load(target.conversationId).then((result) => {
      if (!alive) return;
      setLoaded(result.ok ? { key, messages: result.data.messages, error: false } : { key, messages: [], error: true });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- o alvo é identificado pela chave (key)
  }, [open, key, actions]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
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

  async function send(body: string) {
    if (!target || sending) return;
    setSending(true);
    setSendError(false);
    let conversationId = target.conversationId ?? (createdId?.key === key ? createdId.id : null);
    if (!conversationId && target.agent) {
      const created = await actions.create(shell.workspace.id, target.agent);
      if (created.ok) {
        conversationId = created.data.id;
        setCreatedId({ key, id: conversationId });
      }
    }
    if (!conversationId) {
      setSending(false);
      setSendError(true);
      return;
    }
    const result = await actions.send(conversationId, body);
    setSending(false);
    if (!result.ok) {
      setSendError(true);
      return;
    }
    setInput("");
    setLoaded((prev) => (prev && prev.key === key ? { ...prev, messages: [...prev.messages, result.data] } : prev));
  }

  const cls = baseCls + (suggestions.length ? " has-sug" : "");
  const today = now ?? new Date();
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
                ) : room ? (
                  <span className="ps-cvh-st">
                    <span>{t("roomStatus")}</span>
                  </span>
                ) : agent ? (
                  <span className="ps-cvh-st">
                    <span>{tc(`areas.${agent.id}`)}</span>
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
          <div className="ps-msgs" aria-live="polite" ref={scroller}>
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
