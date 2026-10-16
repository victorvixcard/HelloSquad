"use client";

import { Agent, CommandField, getAgent, Icon, PRODUCT_ICONS, SQUAD, type AgentId } from "@hellosquad/ui";
import type { components } from "@hellosquad/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  createDirectConversationAction,
  createWorkItemAction,
  decideApprovalAction,
  loadConversationAction,
  loadOlderMessagesAction,
  openObjectConversationAction,
  sendMessageAction,
} from "@/app/app/[workspace]/actions";
import { addObjectiveAction } from "@/app/app/[workspace]/memory-actions";
import { conversationLive, shortNowKey } from "@/lib/live/live-state";
import { dayKey, dayLabel, shortTime, threadAt, threadTitleFrom } from "./conversation-format";
import { useLive } from "./live";
import { MaterialCard, type MaterialCardActions } from "./MaterialCard";
import { usePopoverDismiss } from "./Popover";
import { useShell, type ConversationTarget } from "./shell-context";
import { SquadStatus, type SquadStatusKind } from "./SquadStatus";
import { useSquadEffect } from "./use-squad-effect";

type Message = components["schemas"]["Message"];
type Opening = components["schemas"]["ConversationOpening"];
type ApiContext = components["schemas"]["ConversationContext"];

export type ConversationActions = {
  load: typeof loadConversationAction;
  older: typeof loadOlderMessagesAction;
  send: typeof sendMessageAction;
  create: typeof createDirectConversationAction;
  createWork: typeof createWorkItemAction;
  decide: typeof decideApprovalAction;
  /** Cartão "Material · vN" das mensagens com entrega (padrão: as Server Actions). */
  card?: MaterialCardActions;
  /** Objetivo do primeiro acesso guardado na Memória da Marca (padrão: `addObjectiveAction`). */
  addObjective?: typeof addObjectiveAction;
  /** Conversa de um objeto (A2b: ambiente, pedido do catálogo, post, indicador…; padrão: `openObjectConversationAction`). */
  openObject?: typeof openObjectConversationAction;
};

/** Anexo que o worker põe na mensagem do agente quando entrega uma versão (S1c, `store.py`). */
function deliveryAttachment(m: Message): string | null {
  if (!m.run_id || !Array.isArray(m.attachments)) return null;
  for (const a of m.attachments as Array<Record<string, unknown> | null>) {
    if (a && a.type === "delivery_version" && typeof a.delivery_version_id === "string") return a.delivery_version_id;
  }
  return null;
}

const DEFAULT_ACTIONS: ConversationActions = {
  load: loadConversationAction,
  older: loadOlderMessagesAction,
  send: sendMessageAction,
  create: createDirectConversationAction,
  createWork: createWorkItemAction,
  decide: decideApprovalAction,
};

/** Mensagem da pessoa antes da API confirmar (aparece na hora; some se o envio falhar). */
const TEMP = "tmp-";

/** Perto do topo (px), a rolagem traz as mensagens anteriores (`before=`). */
const OLDER_AT = 48;

type Loaded = {
  key: string;
  messages: Message[];
  older: string | null;
  error: boolean;
  /** Conversa do ambiente (H1-04): a primeira fala do agente e as sugestões, calculadas pela API a cada leitura. */
  opening?: Opening | null;
  /** Cartão do objeto como a API o lê agora (título, estado, resumo, período, origem). */
  context?: ApiContext | null;
};

function targetKey(target: ConversationTarget | null): string {
  if (!target) return "";
  const ref = target.context?.ref;
  const obj = ref ? `${ref.type}:${ref.id ?? ref.key ?? ""}` : "";
  return `${target.conversationId ?? "nova"}:${target.agent ?? "squad"}:${target.context?.label ?? ""}:${obj}`;
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
  const tl = useTranslations("live");
  const locale = useLocale();
  const shell = useShell();
  const live = useLive();
  const router = useRouter();
  const squadEffect = useSquadEffect(actions);
  const { mode, target } = shell.conversation;
  const open = mode !== "off" && !!target;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [threadsOpen, setThreadsOpen] = useState(false);
  // Coluna "Contexto da conversa" (V4.6 `cv.rail`, ligada por padrão): só em tela cheia a partir de 940 px.
  const [railOn, setRailOn] = useState(true);
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

  // "Pedir ajuste": a conversa abre com o texto do protótipo no campo; o envio registra o pedido de ajuste.
  const draft = open ? target?.draft : undefined;
  const adjust = open ? (target?.adjust ?? null) : null;
  useEffect(() => {
    if (draft) setInput(draft);
  }, [draft, key]);

  // Mensagem nova de agente nesta conversa (Realtime `message.created`): busca a última página e junta.
  const conversationId = open ? (target?.conversationId ?? null) : null;
  const arrivals = conversationId ? (live.state.messages[conversationId] ?? 0) : 0;
  useEffect(() => {
    if (!conversationId || !arrivals) return;
    let alive = true;
    actions.load(conversationId).then((result) => {
      if (!alive || !result.ok) return;
      setLoaded((prev) => {
        if (!prev || prev.key !== key) return prev;
        const fresh = result.data.messages;
        const known = new Set(fresh.map((m) => m.id));
        // Mantém as anteriores já carregadas e a mensagem otimista que ainda não voltou da API.
        const kept = prev.messages.filter((m) => !known.has(m.id) && (m.id.startsWith(TEMP) || Date.parse(m.created_at) < Date.parse(fresh[0]?.created_at ?? "")));
        return { ...prev, messages: [...kept.filter((m) => !m.id.startsWith(TEMP)), ...fresh, ...kept.filter((m) => m.id.startsWith(TEMP))] };
      });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reage a cada mensagem nova da conversa aberta
  }, [conversationId, arrivals]);

  // Abriu: guarda quem abriu (o foco volta para ele) e leva o foco ao campo. Trocar de conversa pelo
  // seletor não troca quem abriu.
  useEffect(() => {
    if (!open) return;
    const active = document.activeElement as HTMLElement | null;
    if (!section.current?.contains(active)) opener.current = active;
    const id = requestAnimationFrame(() => section.current?.querySelector<HTMLElement>("textarea, input")?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, key]);

  // A2b: conversa de objeto que ainda não tem id (o ambiente, um post, um indicador, um segmento, um documento): a API
  // cria ou devolve a que já existe, e o painel segue nela. O pedido do catálogo (`capability`) nasce na 1ª mensagem.
  const pendingRef =
    open && target && !target.conversationId && target.context?.ref && target.context.ref.type !== "capability"
      ? target.context.ref
      : null;
  useEffect(() => {
    if (!pendingRef || !target) return;
    let alive = true;
    const openObject = actions.openObject ?? openObjectConversationAction;
    openObject(shell.workspace.id, pendingRef, target.agent ?? undefined).then((result) => {
      if (!alive) return;
      if (!result.ok) {
        setLoaded({ key, messages: [], older: null, error: true });
        return;
      }
      shell.openConversation({ ...target, conversationId: result.data.id }, mode === "full" ? "full" : "panel");
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- o alvo é identificado pela chave (key)
  }, [key, !!pendingRef]);

  // Reabrir sobre o mesmo objeto retoma o histórico: a última página de mensagens vem da API (só leitura).
  useEffect(() => {
    if (!open || !target) return;
    if (!target.conversationId) {
      if (pendingRef) return;
      setLoaded((prev) => (prev?.key === key ? prev : { key, messages: [], older: null, error: false }));
      return;
    }
    let alive = true;
    setLoaded((prev) => (prev?.key === key ? prev : null));
    actions.load(target.conversationId).then((result) => {
      if (!alive) return;
      setLoaded((prev) => {
        if (!result.ok) return { key, messages: [], older: null, error: true };
        const fresh = result.data.messages;
        // Mensagem enviada enquanto a conversa carregava (a leitura saiu antes do envio): não some da tela.
        const seen = new Set(fresh.map((m) => m.id));
        const last = Date.parse(fresh[fresh.length - 1]?.created_at ?? "") || 0;
        const sent =
          prev?.key === key
            ? prev.messages.filter((m) => !seen.has(m.id) && (m.id.startsWith(TEMP) || Date.parse(m.created_at) >= last))
            : [];
        return {
          key,
          messages: [...fresh, ...sent],
          older: result.data.older,
          error: false,
          opening: result.data.detail.opening ?? null,
          context: result.data.detail.context ?? null,
        };
      });
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
  // Papel ao lado do nome (V4.6 L10894 e L13880): sai quando o objeto da conversa tem o mesmo nome (o ambiente dele).
  const area = agent && !room ? tc(`areas.${agent.id}`) : "";
  const role = area && target.context?.label !== area ? area : "";
  const messages = loaded?.key === key ? loaded.messages : [];
  // Status vivo da conversa (V4.6 L8511 e `.ps-cstat`): run em curso (trabalho), pendência desta conversa (espera)
  // ou conexão perdida (estado técnico). "<Nome> está escrevendo" enquanto um agente está numa etapa.
  const convLive = conversationLive(live.state, target.conversationId);
  const typingAgent = convLive?.typing ?? null;
  // V4.6 `hasSug: !userAfter && !o.typing` (L10898, L10912): as sugestões somem na primeira mensagem da pessoa. Com
  // páginas anteriores ainda não carregadas, a conversa já teve mensagem da pessoa.
  const userWrote = messages.some((m) => m.author_type === "user") || !!(loaded?.key === key && loaded.older);
  const objectiveMode = !!target.objective && target.agent === "nexo" && !userWrote && !typingAgent;
  const opening = loaded?.key === key ? (loaded.opening ?? null) : null;
  const suggestions: string[] = objectiveMode
    ? (t.raw("objective.options") as string[])
    : !room && target.agent && !userWrote && !typingAgent && opening?.suggestions.length
      ? opening.suggestions
      : !room && target.agent && !userWrote && !typingAgent && !target.context?.ref && ["nexo", "otto", "iris"].includes(target.agent)
        ? (t.raw(`suggestions.${target.agent as "nexo" | "otto" | "iris"}`) as string[])
        : [];
  const suggestionsLabel = objectiveMode
    ? t("objective.ask", { business: shell.workspace.name })
    : agent
      ? t("ask", { article: agent.article, name: agent.name })
      : "";
  const placeholder = room
    ? t("placeholderRoom")
    : t("placeholder", { to: tc("agentTo", { article: agent?.article ?? "o", name: agent?.name ?? "" }) });
  const sameMode = mode === "full" ? "full" : "panel";
  const today = now ?? new Date();

  const waitHere = target.conversationId
    ? Object.values(live.state.pending).find((p) => shell.workConversations[p.workItemId] === target.conversationId)
    : undefined;
  const lost = live.state.connection === "lost";
  const st: { kind: SquadStatusKind; lead: AgentId | null; m: string; d: string } | null = convLive
    ? {
        kind: "work",
        lead: convLive.lead,
        m: getAgent(convLive.lead).name,
        d: convLive.detail === "adjusting" ? tl("detail.adjustingNext") : tl(`detail.${convLive.detail}`),
      }
    : waitHere
      ? {
          kind: "wait",
          lead: waitHere.agent,
          m: getAgent(waitHere.agent).name,
          d: waitHere.kind === "respond" ? tl("detail.waitAnswer") : tl("detail.waitApproval"),
        }
      : null;
  const md = agent ? live.modes[agent.id] : "idle";
  const headStatus = room
    ? st
      ? `${st.m} · ${st.d}`
      : t("roomStatus")
    : agent
      ? typingAgent === agent.id
        ? tl("typingStatus")
        : st && st.lead === agent.id
          ? st.d
          : tl(`short.${shortNowKey(agent.id, md)}`)
      : "";
  const headLive = st?.kind === "work" || md === "work";
  const headExpr = st && st.kind === "wait" && agent && st.lead === agent.id ? "big" : "oval";
  const headThink = !!agent && ((st?.kind === "work" && st.lead === agent.id) || typingAgent === agent.id);

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

  /** Envio (A1a): a mensagem da pessoa aparece na hora; se a API recusar, ela sai e o texto volta ao campo. */
  async function send(body: string): Promise<boolean> {
    if (!target || sending) return false;
    setSending(true);
    setSendError(false);
    const tempId = `${TEMP}${Date.now()}`;
    const temp: Message = {
      id: tempId,
      conversation_id: target.conversationId ?? "",
      author_type: "user",
      author_user_id: null,
      author_agent_id: null,
      run_id: null,
      body,
      body_format: "markdown",
      attachments: [],
      created_at: new Date().toISOString(),
    };
    setInput("");
    setLoaded((prev) => (prev && prev.key === key ? { ...prev, messages: [...prev.messages, temp] } : { key, messages: [temp], older: null, error: false }));
    const drop = () => {
      setLoaded((prev) => (prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== tempId) } : prev));
      setInput(body);
      setSending(false);
      setSendError(true);
      return false;
    };

    let conversationId = target.conversationId;
    let created: string | null = null;
    const ref = target.context?.ref;
    if (!conversationId && ref) {
      // Pedido do catálogo (A2b): a conversa do pedido nasce com a primeira mensagem, uma por pedido.
      const made = await (actions.openObject ?? openObjectConversationAction)(shell.workspace.id, ref, target.agent ?? undefined);
      if (made.ok) conversationId = created = made.data.id;
    } else if (!conversationId && target.agent) {
      const made = await actions.create(shell.workspace.id, target.agent, threadTitleFrom(body));
      if (made.ok) conversationId = created = made.data.id;
    }
    if (!conversationId) return drop();
    const result = await actions.send(conversationId, body);
    if (!result.ok) return drop();
    const posted = result.data;

    // O que a mensagem faz no squad (ajuste, resposta ou pedido que vira trabalho): use-squad-effect.ts.
    const done = await squadEffect({
      conversationId,
      messageId: posted.id,
      body,
      adjust,
      deliveryType: target.deliveryType,
      coordinator: room || target.agent === "nexo",
    });
    if (!done) setSendError(true);
    setSending(false);

    if (created && target.agent) {
      // A conversa passou a existir: entra no topo do histórico do especialista e o painel segue nela.
      const next: ConversationTarget = { conversationId: created, agent: target.agent, context: target.context };
      // Só a conversa direta entra no seletor "Conversas com…"; a de objeto fica na lista de Minha Equipe & Conversas.
      if (!ref) shell.rememberThread(target.agent, { id: created, title: threadTitleFrom(body), at: posted.created_at });
      setLoaded({ key: targetKey(next), messages: [...messages.filter((m) => m.id !== tempId), posted], older: null, error: false });
      shell.openConversation(next, sameMode);
      return true;
    }
    setLoaded((prev) => (prev ? { ...prev, messages: prev.messages.map((m) => (m.id === tempId ? posted : m)) } : prev));
    // O pedido de ajuste foi enviado: a conversa segue sem o modo de ajuste (o próximo envio é mensagem comum).
    if (adjust) shell.openConversation({ ...target, adjust: undefined, draft: undefined }, sameMode);
    return true;
  }

  /**
   * "Conte o resto ao Nexo" (V4.6 `obj:`, L7040): a escolha vira a mensagem da pessoa ("<objetivo>.") e o objetivo
   * entra na Memória da Marca, confirmado. A resposta do Nexo é a do squad de verdade, não um roteiro.
   */
  async function pickObjective(objective: string) {
    if (!(await send(`${objective}.`))) return;
    const saved = await (actions.addObjective ?? addObjectiveAction)(shell.workspace.id, objective);
    if (!saved.ok) {
      shell.toast(saved.message || t("objective.error"));
      return;
    }
    shell.toast(t("objective.saved", { objective }));
    router.refresh();
  }

  // Cartão de contexto da V4.6 (`_vRail`, L10916): Ambiente, Tipo, Período (quando há), Negócio e Origem (quando há);
  // quem responde; "Voltar para <Ambiente>". O que o cartão sabe vem de quem abriu a conversa.
  const ctx = target.context;
  const apiCtx = loaded?.key === key ? (loaded.context ?? null) : null;
  const wide = mode === "full" && shell.layout.convW >= 940;
  const envOf = agent ? tc(`areas.${agent.id}`) : "";
  const envHref = ctx?.href ?? (agent ? `/app/${shell.workspace.slug}/squad/${agent.id}` : null);
  const railFacts: Array<{ k: string; v: string }> = ctx
    ? [
        { k: t("rail.env"), v: envOf },
        ...(ctx.kind !== "work_item" ? [{ k: t("rail.type"), v: t(`rail.types.${ctx.kind}`) }] : []),
        ...((ctx.period ?? apiCtx?.period) ? [{ k: t("rail.period"), v: (ctx.period ?? apiCtx?.period) as string }] : []),
        { k: t("rail.business"), v: shell.workspace.name },
        ...((ctx.origin ?? apiCtx?.origin) ? [{ k: t("rail.origin"), v: (ctx.origin ?? apiCtx?.origin) as string }] : []),
      ]
    : [];
  const showRail = wide && railOn && !!ctx && !!agent;

  const cls = baseCls + (suggestions.length ? " has-sug" : "") + (showRail ? " has-rail" : "");
  let lastDay = "";

  return (
    <section ref={section} className={cls} style={{ width: shell.layout.convW }} aria-label={t("label")}>
      <div className="ps-cv-in" style={{ width: lastWidth.current }}>
        <header className="ps-cvh">
          <div className="ps-cvh-who">
            {room ? (
              <div className="ps-cvh-room" aria-hidden="true">
                {SQUAD.map((m) => (
                  <Agent
                    key={m.id}
                    agent={m.id}
                    size={26}
                    expression={live.modes[m.id] === "wait" ? "big" : "oval"}
                    thinking={live.modes[m.id] === "work"}
                  />
                ))}
              </div>
            ) : agent ? (
              <span className="ps-cvh-av">
                <Agent agent={agent.id} size={40} expression={headExpr} thinking={headThink} />
              </span>
            ) : null}
            <div className="ps-cvh-t">
              <div className="ps-cvh-n">
                <b>{title}</b>
                {role ? <span className="ps-cvh-r">{role}</span> : null}
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
                ) : null}
                <span className="ps-cvh-st">
                  {headLive ? <span className="ps-live-s" /> : null}
                  <span>{headStatus}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="ps-cvh-a">
            {wide && ctx && agent ? (
              <button
                type="button"
                className={"ps-iconbtn" + (railOn ? " is-on" : "")}
                aria-pressed={railOn}
                aria-label={t("rail.toggle")}
                title={t("rail.tip")}
                onClick={() => setRailOn((v) => !v)}
              >
                <svg className="ps-ic" viewBox="0 0 18 18" aria-hidden="true">
                  <path d={PRODUCT_ICONS.panel} />
                </svg>
              </button>
            ) : null}
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
        {lost ? (
          <div className="ps-cstat">
            <SquadStatus kind="tech" lead={null} message={tl("lost")} detail={tl("lostDetail")} />
          </div>
        ) : st ? (
          <div className="ps-cstat">
            <SquadStatus kind={st.kind} lead={st.lead} message={st.m} detail={st.d} />
          </div>
        ) : null}
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
              {opening && loaded?.key === key && !loaded.older && !loaded.error ? (
                // Conversa do ambiente (H1-04, V4.6 `_cxEnvFirst`): a primeira fala do agente, calculada pela API agora.
                <>
                  {messages.length === 0 ? (
                    <div className="ps-day">
                      <span>{t("today")}</span>
                    </div>
                  ) : null}
                  <div className="ps-msg">
                    <div className="ps-msg-av">
                      <Agent agent={(opening.agent_id as AgentId) ?? target.agent ?? "nexo"} size={32} />
                    </div>
                    <div className="ps-msg-b">
                      <div className="ps-msg-n">
                        <b>{getAgent(opening.agent_id as AgentId).name}</b>
                        <span className="ps-msg-r">{tc(`areas.${opening.agent_id as AgentId}`)}</span>
                      </div>
                      <div className="ps-msg-t">{opening.message}</div>
                    </div>
                  </div>
                </>
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
                  const mat = deliveryAttachment(m);
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
                        {mat && m.run_id ? <MaterialCard runId={m.run_id} versionId={mat} target={target} actions={actions.card} /> : null}
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
                <div className="cx-sug" role="group" aria-label={suggestionsLabel}>
                  <span className="cx-sug-k">{suggestionsLabel}</span>
                  {suggestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className="cx-sg"
                      disabled={objectiveMode && sending}
                      onClick={() => (objectiveMode ? void pickObjective(q) : setInput(q))}
                    >
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
              {typingAgent ? (
                <div className="ps-typing">
                  <Agent agent={typingAgent} size={28} thinking />
                  <span>{tl("typing", { name: getAgent(typingAgent).name })}</span>
                  <span className="ps-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              ) : null}
            </div>
          </div>
          {showRail && ctx && agent ? (
            <aside className="ps-rail" aria-label={t("rail.label")}>
              <span className="ps-k">{t("rail.label")}</span>
              <b className="ps-rail-t">{ctx.label}</b>
              {(ctx.meta ?? apiCtx?.summary) ? <small className="ps-rail-s">{ctx.meta ?? apiCtx?.summary}</small> : null}
              <dl className="ps-facts is-s">
                {railFacts.map((f) => (
                  <div key={f.k}>
                    <dt>{f.k}</dt>
                    <dd>{f.v}</dd>
                  </div>
                ))}
              </dl>
              <div className="ps-rail-pp">
                <div className="ps-lr is-static">
                  <Agent agent={agent.id} size={24} />
                  <span className="ps-lr-t">
                    <b>{agent.name}</b>
                    <small>{t("rail.responds", { env: envOf })}</small>
                  </span>
                </div>
              </div>
              {envHref ? (
                <div className="ps-rail-a">
                  <button
                    type="button"
                    className="ps-mini"
                    onClick={() => {
                      shell.openConversation(target, "panel");
                      router.push(envHref);
                    }}
                  >
                    {t("rail.back", { env: envOf })}
                  </button>
                </div>
              ) : null}
            </aside>
          ) : null}
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
              sendLabel={t("sendAria")}
              hint={t("sendHint")}
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
