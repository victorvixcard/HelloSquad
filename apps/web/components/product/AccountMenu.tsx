"use client";

import { Icon, PRODUCT_ICONS } from "@hellosquad/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { signOut } from "@/lib/auth-actions";
import { usePopoverDismiss } from "./Popover";

export type AccountMenuProps = {
  name: string;
  role: "owner" | "admin" | "editor" | "viewer";
  business: { slug: string; name: string };
  businesses: Array<{ slug: string; name: string }>;
  /** "Plano Squad · créditos do mês" (V4.6 L4559) a partir de `GET /me` (S1e): valores provisórios, sem preço. */
  credits?: { plan: string | null; used: number; total: number } | null;
  onUnavailable: () => void;
};

/** Parte do ciclo já usada, em % inteiro (a barra da V4.6: 64% na conta em uso, 4% no primeiro acesso). */
export function creditsPercent(used: number, total: number): number {
  if (!(total > 0)) return 0;
  return Math.min(100, Math.max(0, Math.round((used / total) * 100)));
}

export function initials(text: string): string {
  return (text.trim()[0] ?? "?").toLocaleUpperCase("pt-BR");
}

/** Conta, negócio e configurações: um único lugar, no pé da barra (V4.6). */
export function AccountMenu({ name, role, business, businesses, credits = null, onUnavailable }: AccountMenuProps) {
  const t = useTranslations("shell.account");
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  usePopoverDismiss(open, () => setOpen(false), button, panel);
  const ini = initials(name);
  const bizIni = initials(business.name);
  return (
    <div className="sb-acw">
      <button
        ref={button}
        type="button"
        className="sb-me"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("aria", { name, business: business.name })}
        data-tip={t("tip", { name, business: business.name })}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sb-me-av" aria-hidden="true">
          {ini}
          <i className="sb-me-biz">{bizIni}</i>
        </span>
        <span className="sb-me-t">
          <b>{name}</b>
          <small>{business.name}</small>
        </span>
      </button>
      {open ? (
        <div ref={panel} className="ps-pop sb-pop-acct" role="dialog" aria-label={t("dialog")}>
          <div className="sb-acc-h">
            <span className="sb-me-av" aria-hidden="true">
              {ini}
            </span>
            <span className="sb-acc-t">
              <b>{name}</b>
              <small>{t(`roles.${role}`)}</small>
            </span>
          </div>
          <div className="sb-acc-s">{t("business")}</div>
          <div className="sb-biz-l">
            {businesses.map((b) => {
              const on = b.slug === business.slug;
              return (
                <Link key={b.slug} href={`/app/${b.slug}`} className="sb-bz" aria-current={on ? "page" : undefined} onClick={() => setOpen(false)}>
                  <span className="sb-bz-ic" aria-hidden="true">
                    {initials(b.name)}
                  </span>
                  <span className="sb-bz-t">
                    <b>{b.name}</b>
                  </span>
                  {on ? <Icon name="check" size={16} strokeWidth={2.2} /> : null}
                </Link>
              );
            })}
            <Link href="/app/novo-workspace" className="sb-bz is-add">
              <span className="sb-bz-ic is-add" aria-hidden="true">
                +
              </span>
              <span className="sb-bz-t">
                <b>{t("addBusiness")}</b>
                <small>{t("addBusinessSub")}</small>
              </span>
            </Link>
          </div>
          {credits ? (
            <div className="sb-cred">
              <div className="sb-cred-h">
                <span>{credits.plan ? t("credits", { plan: credits.plan }) : t("creditsNoPlan")}</span>
                <b>{t("creditsPct", { pct: creditsPercent(credits.used, credits.total) })}</b>
              </div>
              <div className="sb-cred-bar">
                <i style={{ width: `${creditsPercent(credits.used, credits.total)}%` }} />
              </div>
            </div>
          ) : null}
          <div className="sb-acc-l">
            <button type="button" className="sb-acc-i" onClick={() => { setOpen(false); onUnavailable(); }}>
              <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                <path d={PRODUCT_ICONS.user} />
              </svg>
              <span>{t("myAccount")}</span>
            </button>
            <button type="button" className="sb-acc-i" onClick={() => { setOpen(false); onUnavailable(); }}>
              <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                <path d={PRODUCT_ICONS.cog} />
              </svg>
              <span>{t("settings")}</span>
            </button>
            <form action={signOut}>
              <button type="submit" className="sb-acc-i is-out">
                <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                  <path d={PRODUCT_ICONS.logout} />
                </svg>
                <span>{t("signOut")}</span>
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
