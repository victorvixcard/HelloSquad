"use client";

import { Agent, AGENT_IDS, Button, getAgent, PRODUCT_ICONS, type AgentId } from "@hellosquad/ui";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { threadAt } from "@/components/product/conversation-format";
import { useShell } from "@/components/product/shell-context";
import { filterChats, type ChatRow, type TeamWork } from "./team-data";

/**
 * Aba "Conversas" (`_vChats` V3 L9569 + V4 L10873): busca, filtro por avatar ("Sala do Squad" e os sete) e
 * as conversas da API, da mais recente para a mais antiga. Clicar abre a conversa em tela cheia (a Sala, na
 * rota dela). Com um especialista no filtro, "Nova conversa com a Kaia" abre um rascunho novo (`fresh`).
 */
export function TeamChats({ chats, works, now }: { chats: ChatRow[]; works: TeamWork[]; now?: Date }) {
  const t = useTranslations("team.chats");
  const tc = useTranslations("common");
  const ts = useTranslations("shell");
  const locale = useLocale();
  const shell = useShell();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [who, setWho] = useState<AgentId | "squad" | null>(null);
  const today = now ?? new Date();

  const rows = useMemo(
    () =>
      chats.map((row) => {
        const room = row.kind === "squad_room";
        const agent = row.agent ? getAgent(row.agent) : null;
        const withAgent = agent ? tc("agentWith", { article: agent.article, name: agent.name }) : "";
        const work = row.contextType === "work_item" ? works.find((w) => w.id === row.contextId) : undefined;
        const title = room
          ? row.topic
            ? t("roomTopic", { topic: row.topic })
            : t("room")
          : row.title || work?.title || t("untitled", { with: withAgent });
        const base = agent ? t("who", { name: agent.name, area: ts(`areas.${agent.id}`) }) : "";
        // V4 L10875: "<Nome> · <Ambiente>" e, na conversa de objeto, " · sobre …"; pedido do catálogo: " · pedido: <nome>" (L11648).
        const about = (type: string | null) =>
          type === "calendar_post" || type === "project" || type === "metric" || type === "environment" || type === "segment" || type === "document"
            ? t(`aboutWhat.${type}`)
            : t("aboutWhat.other");
        const whoLine = room
          ? t("roomWho")
          : row.kind === "group"
            ? t("groupWho")
            : row.kind === "object" && base
              ? row.contextType === "capability" && row.title
                ? t("request", { who: base, name: row.title })
                : t("about", { who: base, what: about(row.contextType) })
              : base;
        const lastAgent = row.last?.agent ? getAgent(row.last.agent).name : null;
        const last = !row.last
          ? ""
          : row.last.by === "user"
            ? t("lastYou", { text: row.last.text || t("material") })
            : lastAgent
              ? t("lastAgent", { name: lastAgent, text: row.last.text || t("material") })
              : row.last.text;
        return { row, title, whoLine, last, work, text: `${title} ${last} ${whoLine}` };
      }),
    [chats, works, t, tc, ts],
  );
  const shown = filterChats(rows, q, who);

  function open({ row, title, work }: (typeof rows)[number]) {
    if (row.kind === "squad_room") {
      router.push(`/app/${shell.workspace.slug}/sala-do-squad`);
      return;
    }
    const agent = row.agent ?? "nexo";
    if (row.kind === "object" && row.contextType === "environment") {
      // H1-04: a conversa do ambiente reabre como conversa do ambiente (cartão "Ambiente", primeira fala e sugestões).
      const area = tc(`areas.${agent}`);
      shell.openConversation(
        {
          conversationId: row.id,
          agent,
          context: { kind: "env", label: area, href: `/app/${shell.workspace.slug}/squad/${agent}`, ref: { type: "environment", key: agent, title: area } },
        },
        "full",
      );
      return;
    }
    if (row.kind === "object") {
      shell.openConversation({ conversationId: row.id, agent, context: { kind: "work_item", label: work?.title ?? title, href: work?.href } }, "full");
      return;
    }
    shell.openConversation({ conversationId: row.id, agent }, "full");
  }

  const filterAgent = who && who !== "squad" ? getAgent(who) : null;

  return (
    <>
      <div className="ps-tbar">
        <label className="ps-search is-wide">
          <svg className="ps-ic" viewBox="0 0 18 18" aria-hidden="true">
            <path d={PRODUCT_ICONS.search} />
          </svg>
          <input type="search" placeholder={t("search")} aria-label={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {filterAgent ? (
          <Button
            variant="soft"
            size="s"
            icon={null}
            style={{ marginLeft: "auto" }}
            onClick={() => shell.openConversation({ conversationId: null, agent: filterAgent.id, fresh: true }, "full")}
          >
            {t("newWith", { with: tc("agentWith", { article: filterAgent.article, name: filterAgent.name }) })}
          </Button>
        ) : null}
        <div className="ps-agfs">
          {(["squad", ...AGENT_IDS] as const).map((a) => {
            const label = a === "squad" ? t("filterRoom") : getAgent(a).name;
            return (
              <button
                key={a}
                type="button"
                className={"ps-agf2" + (who === a ? " is-on" : "")}
                title={label}
                aria-label={label}
                aria-pressed={who === a}
                onClick={() => setWho((cur) => (cur === a ? null : a))}
              >
                {a === "squad" ? (
                  <svg className="ps-ic" viewBox="0 0 18 18" aria-hidden="true">
                    <path d={PRODUCT_ICONS.chat} />
                  </svg>
                ) : (
                  <Agent agent={a} size={22} />
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="ps-chl">
        {shown.map((r) => (
          <button key={r.row.id} type="button" className="ps-ch" onClick={() => open(r)}>
            <span className="ps-ch-av">
              {r.row.kind === "squad_room" ? (
                <span className="ps-room-av is-l">
                  <Agent agent="nexo" size={22} outline />
                  <Agent agent="bia" size={22} outline />
                  <Agent agent="kaia" size={22} outline />
                </span>
              ) : (
                <Agent agent={r.row.agent ?? "nexo"} size={36} />
              )}
            </span>
            <span className="ps-ch-t">
              <b>{r.title}</b>
              <small>{r.whoLine}</small>
              <span className="ps-ch-l">{r.last}</span>
            </span>
            <span className="ps-ch-e">
              <i>{threadAt(r.row.at, today, locale)}</i>
              {r.row.unread > 0 ? <span className="ps-udot" /> : null}
            </span>
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <div className="ps-emptybig is-s">
          <p>{t("none")}</p>
          <Button
            variant="ghost"
            size="s"
            onClick={() => {
              setQ("");
              setWho(null);
            }}
          >
            {t("clear")}
          </Button>
        </div>
      ) : null}
    </>
  );
}
