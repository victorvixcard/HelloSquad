"use client";

import { Button } from "@hellosquad/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useShell } from "@/components/product/shell-context";
import { TeamChats } from "./TeamChats";
import { TeamProfile } from "./TeamProfile";
import type { ChatRow, TeamPending, TeamWork } from "./team-data";

type Tab = "team" | "chats";

/**
 * Minha Equipe & Conversas (V4 `_vEq`, L10879, sobre a V3 `_vTeam` e `_vChats`; template L4720–4765):
 * cabeçalho com o subtítulo de cada aba e "Abrir a Sala do Squad"; abas "Equipe" (os sete) e "Conversas".
 * A API não tem "não lidas": a aba Conversas fica sem o ponto (registrado no relatório da A1b).
 */
export function TeamView({
  business,
  chats,
  works,
  pending,
  initialTab = "team",
}: {
  business: string;
  chats: ChatRow[];
  works: TeamWork[];
  pending: TeamPending[];
  initialTab?: Tab;
}) {
  const t = useTranslations("team");
  const shell = useShell();
  const [tab, setTab] = useState<Tab>(initialTab);
  const counts: Record<Tab, number> = { team: 7, chats: chats.length };

  return (
    <div className="ps-v" style={{ maxWidth: shell.layout.contentW }}>
      <header className="ps-ph">
        <div>
          <h1 className="ps-h1">{t("title")}</h1>
          <p className="ps-sub">{tab === "team" ? t("sub.team", { business }) : t("sub.chats")}</p>
        </div>
        <Button variant="soft" size="s" href={`/app/${shell.workspace.slug}/sala-do-squad`} linkAs={Link}>
          {t("openRoom")}
        </Button>
      </header>
      <div className="eq-tabs" role="tablist" aria-label={t("tabsLabel")}>
        {(["team", "chats"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            id={`eq-tab-${k}`}
            aria-selected={tab === k}
            aria-controls={`eq-panel-${k}`}
            className={"eq-tab" + (tab === k ? " is-on" : "")}
            onClick={() => setTab(k)}
          >
            <span>{t(`tabs.${k}`)}</span>
            <i>{counts[k]}</i>
          </button>
        ))}
      </div>
      {tab === "team" ? (
        <div role="tabpanel" id="eq-panel-team" aria-labelledby="eq-tab-team">
          <TeamProfile business={business} works={works} pending={pending} />
        </div>
      ) : (
        <div role="tabpanel" id="eq-panel-chats" aria-labelledby="eq-tab-chats">
          <TeamChats chats={chats} works={works} />
        </div>
      )}
    </div>
  );
}
