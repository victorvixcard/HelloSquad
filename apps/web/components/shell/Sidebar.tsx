"use client";

import { AgentDot, getAgent, NavIcon } from "@hellosquad/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Ref } from "react";
import { isActive, navGroups } from "@/lib/nav";

type SidebarProps = {
  slug: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onCloseDrawer: () => void;
  firstLinkRef?: Ref<HTMLAnchorElement>;
};

export function Sidebar({ slug, collapsed, onToggleCollapsed, onCloseDrawer, firstLinkRef }: SidebarProps) {
  const pathname = usePathname();
  const groups = navGroups(slug);
  const toggleLabel = collapsed ? "Expandir a barra lateral" : "Recolher a barra lateral";
  let first = true;
  return (
    <nav className="sb" id="barra-lateral" aria-label="Navegação principal">
      <div className="sb-top">
        <Link href={`/app/${slug}`} className="sb-wm" aria-label="HelloSquad, início">
          HelloSquad
        </Link>
        <button
          type="button"
          className="sb-ib sb-tgl"
          aria-label={toggleLabel}
          aria-expanded={!collapsed}
          aria-controls="barra-lateral"
          data-tip={toggleLabel}
          onClick={onToggleCollapsed}
        >
          <NavIcon name="panel" />
        </button>
        <button type="button" className="sb-ib sb-close" aria-label="Fechar o menu" onClick={onCloseDrawer}>
          <svg className="hs-nav-ic" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M4.8 4.8 L13.2 13.2 M13.2 4.8 L4.8 13.2" />
          </svg>
        </button>
      </div>
      <div className="sb-scroll">
        <div className="sb-nav">
          {groups.map((group) => (
            <div
              key={group.key}
              className={`sb-g is-${group.key}`}
              role="group"
              aria-labelledby={`sb-gl-${group.key}`}
            >
              <p className="sb-gl" id={`sb-gl-${group.key}`}>
                <span>{group.label}</span>
              </p>
              {group.items.map((item) => {
                const on = isActive(item, pathname, slug);
                const agent = item.agent ? getAgent(item.agent) : null;
                const name = agent ? `${item.label}, com ${agent.article} ${agent.name}` : item.label;
                const ref = first ? firstLinkRef : undefined;
                first = false;
                return (
                  <Link
                    key={item.key}
                    ref={ref}
                    href={item.href}
                    className={`sb-ni${on ? " is-on" : ""}`}
                    aria-current={on ? "page" : undefined}
                    aria-label={collapsed || agent ? name : undefined}
                    data-tip={agent ? `${item.label} · ${agent.name}` : item.label}
                    data-nav={item.key}
                  >
                    <span className="sb-ico">
                      <NavIcon name={item.icon} />
                    </span>
                    <span className="sb-nl">{item.label}</span>
                    {agent ? (
                      <span className="sb-who">
                        <AgentDot agent={agent.id} />
                        <span className="sb-who-n">{agent.name}</span>
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
