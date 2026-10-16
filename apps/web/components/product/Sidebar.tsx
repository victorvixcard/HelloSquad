"use client";

import { Agent, NAV_ICONS, PANEL_ICON, SQUAD, type AgentExpression, type AgentId } from "@hellosquad/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AccountMenu, type AccountMenuProps } from "./AccountMenu";
import { Notifications } from "./Notifications";

/** Destinos da barra lateral V4.6 (ids do protótipo: a classe i-<id> anima o ícone de cada um). */
export type NavId = "home" | "room" | "proj" | "strat" | "brand" | "cont" | "media" | "crm" | "res" | "auto" | "mem" | "team";

export const ENV_OF_AGENT: Record<AgentId, NavId> = {
  nexo: "proj",
  bia: "strat",
  kaia: "brand",
  otto: "cont",
  kiwi: "media",
  max: "crm",
  iris: "res",
};

const ICON_OF: Record<NavId, readonly string[]> = {
  home: NAV_ICONS.home,
  room: NAV_ICONS.chat,
  proj: NAV_ICONS.works,
  strat: NAV_ICONS.strat,
  brand: NAV_ICONS.brand,
  cont: NAV_ICONS.cont,
  media: NAV_ICONS.media,
  crm: NAV_ICONS.crm,
  res: NAV_ICONS.res,
  auto: NAV_ICONS.auto,
  mem: NAV_ICONS.mem,
  team: NAV_ICONS.team,
};

export type SidebarProps = {
  slug: string;
  current: NavId | null;
  min: boolean;
  onToggle: () => void;
  /** Decisões pendentes ("Precisa de você"): badge de Projetos, como na V4.6. */
  needsCount: number;
  /** Expressão de cada especialista (quem aguarda você fica de olhos grandes). */
  agentExpression: (agent: AgentId) => AgentExpression;
  account: AccountMenuProps;
};

type Item = {
  id: NavId;
  label: string;
  href: string;
  agent?: AgentId;
  say?: string;
  n?: number;
  soft?: boolean;
  sw?: boolean;
  dot?: boolean;
};

function NavIconSvg({ id }: { id: NavId }) {
  const parts = ICON_OF[id];
  return (
    <svg className={`sb-ic i-${id}`} viewBox="0 0 18 18" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <path key={i} className={`p${i + 1}`} d={parts[i] ?? "M9 9"} />
      ))}
    </svg>
  );
}

/** Interruptor do Modo Autônomo na navegação: o Coordenador dorme; acorda em coral quando é a página aberta. */
function AutoSwitch() {
  return (
    <span className="sb-sw is-nav" aria-hidden="true">
      <i className="sb-sw-k">
        <svg className="sb-knob" width="12" height="12" viewBox="-160 -160 320 320" aria-hidden="true" style={{ display: "block" }}>
          <circle cx="0" cy="0" r="150" />
          <g className="hs-k-sleep">
            <path d="M-51.25,-23.75 C-45,-5 -15,-5 -8.75,-23.75" style={{ fill: "none", stroke: "#0F0D22", strokeWidth: 11.88, strokeLinecap: "round" }} />
            <path d="M8.75,-23.75 C15,-5 45,-5 51.25,-23.75" style={{ fill: "none", stroke: "#0F0D22", strokeWidth: 11.88, strokeLinecap: "round" }} />
          </g>
          <g className="hs-k-open">
            <ellipse cx="-30" cy="-28" rx="21.85" ry="26.45" style={{ fill: "#0F0D22" }} />
            <ellipse cx="30" cy="-28" rx="21.85" ry="26.45" style={{ fill: "#0F0D22" }} />
          </g>
        </svg>
      </i>
    </span>
  );
}

/** Barra lateral da Product UI V4.6: Principal, Seu squad e Gestão; conta e notificações na base. */
export function Sidebar({ slug, current, min, onToggle, needsCount, agentExpression, account }: SidebarProps) {
  const t = useTranslations("shell");
  const tc = useTranslations("common");
  const base = `/app/${slug}`;
  const toggleLabel = min ? t("toggle.expand") : t("toggle.collapse");

  const groups: Array<{ key: "main" | "squad" | "mgmt"; items: Item[] }> = [
    {
      key: "main",
      items: [
        { id: "home", label: t("items.home"), href: base },
        { id: "room", label: t("items.room"), href: `${base}/sala-do-squad`, say: t("say.roomAll") },
      ],
    },
    {
      key: "squad",
      items: SQUAD.map((member) => {
        const id = ENV_OF_AGENT[member.id];
        const n = id === "proj" ? needsCount : 0;
        return {
          id,
          label: t(`areas.${member.id}`),
          href: `${base}/squad/${member.id}`,
          agent: member.id,
          n,
          say: n ? t("say.needs", { count: n }) : undefined,
        };
      }),
    },
    {
      key: "mgmt",
      items: [
        { id: "auto", label: t("items.auto"), href: `${base}/modo-autonomo`, sw: true, soft: true, say: t("say.autoNone") },
        { id: "mem", label: t("items.mem"), href: `${base}/memoria-da-marca`, soft: true },
        { id: "team", label: t("items.team"), href: `${base}/equipe` },
      ],
    },
  ];

  return (
    <nav className="sb" style={{ width: min ? 72 : 256 }} aria-label={t("navLabel")}>
      <div className="sb-top">
        <span className="sb-wm">{tc("brand")}</span>
        <button
          type="button"
          className="sb-ib sb-tgl"
          aria-label={toggleLabel}
          aria-expanded={!min}
          data-tip={toggleLabel}
          onClick={onToggle}
        >
          <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
            <path d={PANEL_ICON} />
          </svg>
        </button>
      </div>
      <div className="sb-scroll">
        <div className="sb-nav">
          {groups.map((group) => (
            <div key={group.key} className={`sb-g is-${group.key}`} role="group" aria-label={t(`groups.${group.key}`)}>
              <div className="sb-gl" aria-hidden="true">
                <span>{t(`groups.${group.key}`)}</span>
              </div>
              {group.items.map((item) => {
                const on = current === item.id;
                const agent = item.agent ? SQUAD.find((m) => m.id === item.agent) : undefined;
                const aria = agent
                  ? item.say
                    ? t("itemAriaSay", { label: item.label, agent: agent.name, say: item.say })
                    : t("itemAria", { label: item.label, agent: agent.name })
                  : item.say
                    ? t("itemAriaSayOnly", { label: item.label, say: item.say })
                    : item.label;
                const tip = agent
                  ? t("itemTip", { label: item.label, agent: agent.name }) + (item.say ? ` · ${item.say}` : "")
                  : item.say
                    ? t("itemTipSay", { label: item.label, say: item.say })
                    : item.label;
                const cls =
                  "sb-ni" +
                  (on ? " is-on" : "") +
                  (item.sw ? " is-sw" : "") +
                  (agent ? " has-who" : "") +
                  (item.label.length > 20 ? " is-long" : "");
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cls}
                    aria-current={on ? "page" : undefined}
                    aria-label={aria}
                    data-tip={tip}
                    data-nav={item.id}
                  >
                    <span className="sb-ico">
                      {item.sw ? <AutoSwitch /> : <NavIconSvg id={item.id} />}
                      {item.dot ? <i className="sb-dot is-on" /> : null}
                    </span>
                    <span className="sb-nl">{item.label}</span>
                    {agent ? (
                      <span className="sb-who" aria-hidden="true">
                        <span className="sb-who-av">
                          <Agent agent={agent.id} size={16} expression={agentExpression(agent.id)} />
                        </span>
                        <span className="sb-who-n">{agent.name}</span>
                      </span>
                    ) : null}
                    {item.n ? <span className={`sb-nb${item.soft ? " is-soft" : ""}`}>{item.n}</span> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="sb-foot">
        <AccountMenu {...account} />
        <Notifications />
      </div>
    </nav>
  );
}
