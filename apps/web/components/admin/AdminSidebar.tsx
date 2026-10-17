"use client";

import { Agent, AGENT_IDS, getAgent } from "@hellosquad/ui";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Fragment, useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ADMIN_NAV, adminNavOf } from "./nav";
import { Icon } from "./ui";

export type AdminPerson = { name: string; email: string };

/**
 * Barra lateral do Super Admin (SA0): wordmark com a etiqueta "Super Admin" no lugar da DEMO, os grupos Operação e
 * Squad IA e a pessoa no pé. Item que chega numa fatia futura aparece desabilitado com "em breve".
 */
export function AdminSidebar({ person }: { person: AdminPerson }) {
  const t = useTranslations("admin.shell");
  const pathname = usePathname() ?? "";
  const current = adminNavOf(pathname);
  const agentOpen = /^\/admin\/squad\/([^/?#]+)/.exec(pathname)?.[1] ?? null;
  return (
    <nav className="sa-sb" aria-label={t("navLabel")}>
      <div className="sa-sb-top">
        <Link className="sa-wm" href="/admin/contas" aria-label={t("wordmarkLabel")}>
          HelloSquad
        </Link>
        <span className="sa-wm-tag">{t("tag")}</span>
      </div>
      <div className="sa-sb-scroll">
        {ADMIN_NAV.map((group) => (
          <div key={group.id} className="sa-g" role="group" aria-labelledby={`sa-gl-${group.id}`}>
            <div className="sa-gl" id={`sa-gl-${group.id}`}>
              {t(`groups.${group.id}`)}
            </div>
            {group.items.map((item) =>
              item.href ? (
                <Fragment key={item.id}>
                  <a
                    className={`sa-ni${current === item.id ? " is-on" : ""}`}
                    href={item.href}
                    aria-current={current === item.id && !agentOpen ? "page" : undefined}
                  >
                    <Icon name={item.icon} />
                    <span className="sa-ni-l">{t(`nav.${item.id}`)}</span>
                  </a>
                  {/* Nas páginas do squad, os sete aparecem como subnavegação com o agente mini do DS (SA0). */}
                  {item.id === "squad" && current === "squad" ? (
                    <div className="sa-ags">
                      {AGENT_IDS.map((id) => (
                        <a
                          key={id}
                          className={`sa-ag${agentOpen === id ? " is-on" : ""}`}
                          href={`/admin/squad/${id}`}
                          aria-current={agentOpen === id ? "page" : undefined}
                        >
                          <Agent agent={id} size={18} />
                          <span>{getAgent(id).name}</span>
                        </a>
                      ))}
                    </div>
                  ) : null}
                </Fragment>
              ) : (
                <span
                  key={item.id}
                  className="sa-ni is-soon"
                  aria-disabled="true"
                  title={t("soonTitle", { slice: item.slice ?? "" })}
                >
                  <Icon name={item.icon} />
                  <span className="sa-ni-l">{t(`nav.${item.id}`)}</span>
                  <span className="sa-soon">{t("soon")}</span>
                </span>
              ),
            )}
          </div>
        ))}
      </div>
      <PersonMenu person={person} />
    </nav>
  );
}

/** Menu da pessoa no pé da barra (como a conta da Product UI V4.6): ir para o produto e sair. */
function PersonMenu({ person }: { person: AdminPerson }) {
  const t = useTranslations("admin.shell.me");
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    wrap.current?.querySelector<HTMLElement>(".hs-mi")?.focus();
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const onKey = (e: KeyboardEvent) => {
    if (!open) return;
    const items = Array.from(wrap.current?.querySelectorAll<HTMLElement>(".hs-mi") ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      button.current?.focus();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      items[(i + step + items.length) % items.length]?.focus();
    } else if (e.key === "Tab") setOpen(false);
  };

  return (
    <div className="sa-sb-foot sa-me" ref={wrap} onKeyDown={onKey}>
      <button
        ref={button}
        type="button"
        className="sa-me-b"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("open", { name: person.name })}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sa-me-av" aria-hidden="true">
          {person.name.charAt(0).toUpperCase()}
        </span>
        <span className="sa-me-t">
          <b>{person.name}</b>
          <small>{person.email}</small>
        </span>
        <Icon name="chev" className="sa-me-chev" />
      </button>
      {open ? (
        <div className="sa-me-pop">
          <div className="hs-menu" role="menu" aria-label={person.email}>
            {/* Navegação inteira de propósito: o CSS do painel não segue para o produto. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="hs-mi" role="menuitem" href="/app" tabIndex={-1}>
              <Icon name="out" />
              {t("product")}
            </a>
            <a className="hs-mi" role="menuitem" href="/sair" tabIndex={-1}>
              <Icon name="logout" />
              {t("signOut")}
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
