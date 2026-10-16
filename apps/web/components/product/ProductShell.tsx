"use client";

import { Agent, type AgentExpression, type AgentId } from "@hellosquad/ui";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { productLayout, type ConversationMode } from "@/lib/product-layout";
import type { AccountMenuProps } from "./AccountMenu";
import { ConversationPanel } from "./ConversationPanel";
import { ShellContext, type ConversationTarget, type ShellApi } from "./shell-context";
import { ENV_OF_AGENT, Sidebar, type NavId } from "./Sidebar";

export const SIDEBAR_COOKIE = "hs_sb";

/** Ambientes-piloto da V4.6 (PILOTS): a conversa abre por cima quando espremer comprometeria a visão. */
const PILOT_AGENTS: AgentId[] = ["nexo", "otto", "iris"];

export type ProductShellProps = {
  workspace: { id: string; slug: string; name: string };
  account: Omit<AccountMenuProps, "onUnavailable">;
  needsCount: number;
  /** Especialistas com decisão pendente: olhos grandes (expressão "big" da V4.6 para quem espera). */
  waitingAgents: AgentId[];
  conversationIds: ShellApi["conversationIds"];
  /** Escolha salva da pessoa (null = automático pela largura, como no protótipo). */
  initialSideMin: boolean | null;
  children: ReactNode;
};

function navOf(pathname: string, slug: string): { nav: NavId | null; agent: AgentId | null; room: boolean } {
  const base = `/app/${slug}`;
  if (pathname === base) return { nav: "home", agent: null, room: false };
  const rest = pathname.slice(base.length + 1).split("/");
  if (rest[0] === "sala-do-squad") return { nav: "room", agent: null, room: true };
  if (rest[0] === "modo-autonomo") return { nav: "auto", agent: null, room: false };
  if (rest[0] === "memoria-da-marca") return { nav: "mem", agent: null, room: false };
  if (rest[0] === "equipe") return { nav: "team", agent: null, room: false };
  if (rest[0] === "squad" && rest[1] && rest[1] in ENV_OF_AGENT) {
    const agent = rest[1] as AgentId;
    return { nav: ENV_OF_AGENT[agent], agent, room: false };
  }
  return { nav: null, agent: null, room: false };
}

function useViewport() {
  const [vp, setVp] = useState({ vw: 1440, vh: 900 });
  useEffect(() => {
    const on = () => setVp({ vw: window.innerWidth, vh: window.innerHeight });
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return vp;
}

/**
 * Casca da Product UI V4.6: barra lateral, palco (área principal) e o painel de conversa universal,
 * com as medidas do renderVals() do protótipo. A conversa vive aqui para persistir entre ambientes.
 */
export function ProductShell(props: ProductShellProps) {
  const { workspace, account, needsCount, waitingAgents, conversationIds, initialSideMin, children } = props;
  const t = useTranslations("shell");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const { vw, vh } = useViewport();
  const [sideMin, setSideMin] = useState<boolean | null>(initialSideMin);
  const [conv, setConv] = useState<{ mode: ConversationMode; target: ConversationTarget | null }>({ mode: "off", target: null });
  const [toastState, setToastState] = useState<{ text: string; agent: AgentId; key: number } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const where = navOf(pathname, workspace.slug);

  // A Sala do Squad é a conversa com todo o squad, em tela cheia (V4.6: _openConv('squad', { mode: 'full' })).
  const roomRoute = where.room;
  const mode: ConversationMode = roomRoute ? "full" : conv.mode;
  const roomTarget = useMemo<ConversationTarget>(
    () => ({ conversationId: conversationIds.room, agent: null, room: true }),
    [conversationIds.room],
  );
  const target: ConversationTarget | null = roomRoute ? roomTarget : conv.target;

  const layout = productLayout({
    vw,
    vh,
    sideMin,
    mode,
    pilot: !!where.agent && PILOT_AGENTS.includes(where.agent),
    pop: false,
  });

  const toast = useCallback((text: string, agent: AgentId = "nexo") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastState({ text, agent, key: Date.now() });
    toastTimer.current = setTimeout(() => setToastState(null), 3200);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const openConversation = useCallback<ShellApi["openConversation"]>((next, nextMode = "panel") => {
    setConv({ mode: nextMode, target: next });
  }, []);
  const closeConversation = useCallback(() => {
    setConv({ mode: "off", target: null });
    if (roomRoute) router.push(`/app/${workspace.slug}`);
  }, [roomRoute, router, workspace.slug]);

  const api = useMemo<ShellApi>(
    () => ({
      workspace,
      layout,
      conversation: { mode, target },
      openConversation,
      closeConversation,
      conversationIds,
      toast,
    }),
    [workspace, layout, mode, target, openConversation, closeConversation, conversationIds, toast],
  );

  function toggleSide() {
    const next = !layout.min;
    setSideMin(next);
    // Lembrado por cookie para o servidor já desenhar a barra no estado certo (sem pulo).
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "min" : "full"}; path=/app; max-age=31536000; samesite=lax`;
  }

  const expression = (agent: AgentId): AgentExpression => (waitingAgents.includes(agent) ? "big" : "oval");

  return (
    <ShellContext.Provider value={api}>
      <div
        className={
          layout.rootClassName +
          // V4.6: com a conversa do próprio especialista ao lado, a página sabe que ela está aberta.
          (mode === "panel" && target?.agent && where.agent === target.agent ? " is-cvh" : "")
        }
        style={layout.rootStyle as React.CSSProperties}
      >
        <a className="hs-skip" href="#conteudo">
          {t("skipToContent")}
        </a>
        <Sidebar
          slug={workspace.slug}
          current={where.nav}
          min={layout.min}
          onToggle={toggleSide}
          needsCount={needsCount}
          agentExpression={expression}
          account={{ ...account, onUnavailable: () => toast(tc("unavailable")) }}
        />
        <div className="ps-stage">
          <main className="ps-main" id="conteudo" aria-label={t("mainLabel")} tabIndex={-1}>
            <div className="ps-scroll">{children}</div>
          </main>
          <ConversationPanel />
        </div>
        {toastState ? (
          <div key={toastState.key} className="ps-toast" role="status">
            <Agent agent={toastState.agent} size={24} expression="happy" />
            <span>{toastState.text}</span>
          </div>
        ) : null}
      </div>
    </ShellContext.Provider>
  );
}
