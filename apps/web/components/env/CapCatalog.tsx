"use client";

import { Agent, getAgent, PRODUCT_ICONS, type AgentId } from "@hellosquad/ui";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { usePopoverDismiss } from "@/components/product/Popover";
import { useShell } from "@/components/product/shell-context";
import { CAPABILITIES, capabilityKey, type Capability } from "@/lib/capabilities";
import { DELIVERY_OWNER } from "@/lib/delivery-types";

/** Sem acento e em minúsculas, como a busca do protótipo (`capNorm`, L11789). */
function norm(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Abre a conversa de um pedido do catálogo (V4.3 `_openCap`): uma conversa por pedido (`capability`), com o pedido
 * da V4.6 já escrito no campo, sem enviar. O envio cria a conversa e o trabalho da entrega da capacidade (S1c, S2a,
 * S2b), com o especialista dono da entrega à frente. Capacidade sem entrega nesta versão: só o aviso, sem simular.
 */
export function useOpenCapability() {
  const shell = useShell();
  const t = useTranslations("caps");
  const tc = useTranslations("common");
  return useCallback(
    (agent: AgentId, cap: Capability) => {
      if (!cap.code) {
        shell.toast(agent === "kaia" ? t("kaiaWaiting") : t("noDelivery"), agent);
        return;
      }
      const key = capabilityKey(cap.id);
      const business = shell.workspace.name;
      const label = t(`items.${key}.label` as "items.bDiag.label", { business });
      const owner = DELIVERY_OWNER[cap.code];
      const origin = tc(`areas.${agent}`);
      shell.openConversation({
        conversationId: null,
        agent: owner,
        context: { kind: "capability", label, origin, ref: { type: "capability", key: cap.code, title: label, origin } },
        draft: t(`items.${key}.ask` as "items.bDiag.ask", { business }),
        deliveryType: cap.code,
      });
    },
    [shell, t, tc],
  );
}

/**
 * "O que pedir à Bia" (V4.2/V4.3, L11879–11930): o catálogo das capacidades do especialista, por finalidade, com a
 * busca, o vazio e o rodapé da V4.6. Cada capacidade abre a conversa do pedido; Enter escolhe a primeira; Esc fecha.
 */
export function CapCatalog({ agent }: { agent: AgentId }) {
  const t = useTranslations("pages.env");
  const tcap = useTranslations("caps");
  const tc = useTranslations("common");
  const shell = useShell();
  const openCap = useOpenCapability();
  const member = getAgent(agent);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const trig = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useCallback(() => {
    setOpen(false);
    setQ("");
  }, []);
  usePopoverDismiss(open, close, trig, pop);
  useEffect(() => {
    if (open) pop.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [open]);

  const business = shell.workspace.name;
  const groups = tcap.raw(`groups.${agent}`) as string[];
  const items = CAPABILITIES[agent].map((cap) => {
    const key = capabilityKey(cap.id);
    const label = tcap(`items.${key}.label` as "items.bDiag.label", { business });
    const text = tcap(`items.${key}.text` as "items.bDiag.text", { business });
    return { cap, label, text };
  });
  const term = norm(q.trim());
  const shown = term ? items.filter((x) => norm(`${x.label} ${x.text}`).includes(term)) : items;
  const ref = tc("agentRef", { article: member.article, name: member.name });
  const withAgent = tc("agentWith", { article: member.article, name: member.name });

  function pick(cap: Capability) {
    close();
    openCap(agent, cap);
  }

  function onKey(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && shown[0]) {
      event.preventDefault();
      pick(shown[0].cap);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      trig.current?.focus();
    }
  }

  return (
    <div className="cap-w">
      <button
        ref={trig}
        type="button"
        className={`hm-btn is-soft is-s cap-trig${open ? " is-on" : ""}`}
        aria-expanded={open}
        aria-label={open ? tcap("closeAria", { article: member.article, name: member.name }) : t("askAria", { article: member.article, name: member.name })}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
          <path d={PRODUCT_ICONS.capa} />
        </svg>
        <span>
          {t("ask")}
          <span className="cap-trig-ag">{t("askTo", { article: member.article, name: member.name })}</span>
        </span>
        <svg className="sb-ic cap-chev" viewBox="0 0 18 18" aria-hidden="true">
          <path d={PRODUCT_ICONS.chevD} />
        </svg>
      </button>
      {open ? (
        <div ref={pop} className="ps-pop cap-pop is-h" role="dialog" aria-labelledby={titleId}>
          <div className="cap-pop-h">
            <span className="cap-av" aria-hidden="true">
              <Agent agent={agent} size={22} expression="oval" />
            </span>
            <div className="cap-pop-ht">
              <b id={titleId}>{tcap("title", { with: withAgent })}</b>
              <small>{tcap("lead", { article: member.article, name: member.name })}</small>
            </div>
          </div>
          <label className="cap-q">
            <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
              <path d={PRODUCT_ICONS.search} />
            </svg>
            <input
              type="text"
              className="cap-q-i"
              placeholder={tcap(`placeholder.${agent}`)}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
              aria-label={tcap("search")}
            />
          </label>
          <div className="cap-pop-l">
            {groups.map((g, gi) => {
              const list = shown.filter((x) => x.cap.group === gi);
              if (!list.length) return null;
              return (
                <div className="cap-pg" key={g}>
                  <span className="cap-pg-k">{g}</span>
                  {list.map((x) => (
                    <button
                      key={x.cap.id}
                      type="button"
                      className="cap-o"
                      aria-label={`${x.label}. ${x.text}. ${tcap("opens", { with: withAgent })}`}
                      onClick={() => pick(x.cap)}
                    >
                      <span className="cap-o-t">
                        <b>{x.label}</b>
                        <small>{x.text}</small>
                      </span>
                      <svg className="sb-ic cap-i-a" viewBox="0 0 18 18" aria-hidden="true">
                        <path d={PRODUCT_ICONS.chevR} />
                      </svg>
                    </button>
                  ))}
                </div>
              );
            })}
            {!shown.length ? <p className="cap-none">{tcap("empty", { query: q.trim(), ref })}</p> : null}
          </div>
          <footer className="cap-pop-f">{tcap("foot", { ref })}</footer>
        </div>
      ) : null}
    </div>
  );
}
