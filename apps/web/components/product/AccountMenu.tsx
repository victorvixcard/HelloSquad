"use client";

import { Icon, PRODUCT_ICONS } from "@hellosquad/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { LOCALES, type Locale } from "@/i18n/config";
import { signOut } from "@/lib/auth-actions";
import { setUserLocaleAction, type LocaleActionResult } from "@/lib/locale-actions";
import { usePopoverDismiss } from "./Popover";

export type AccountMenuProps = {
  name: string;
  role: "owner" | "admin" | "editor" | "viewer";
  business: { slug: string; name: string };
  businesses: Array<{ slug: string; name: string }>;
  /** "Plano Squad · créditos do mês" (V4.6 L4559) a partir de `GET /me` (S1e): valores provisórios, sem preço. */
  credits?: { plan: string | null; used: number; total: number } | null;
  onUnavailable: () => void;
  /** Aviso curto (o toast da casca). */
  onNotice?: (text: string) => void;
  /** Guarda o idioma da pessoa (padrão: `setUserLocaleAction`, na conta da Auth). */
  setLocale?: (locale: Locale) => Promise<LocaleActionResult>;
};

/** Parte do ciclo já usada, em % inteiro (a barra da V4.6: 64% na conta em uso, 4% no primeiro acesso). */
export function creditsPercent(used: number, total: number): number {
  if (!(total > 0)) return 0;
  return Math.min(100, Math.max(0, Math.round((used / total) * 100)));
}

export function initials(text: string, locale: string = "pt-BR"): string {
  return (text.trim()[0] ?? "?").toLocaleUpperCase(locale);
}

/** Conta, negócio e configurações: um único lugar, no pé da barra (V4.6). */
export function AccountMenu({
  name,
  role,
  business,
  businesses,
  credits = null,
  onUnavailable,
  onNotice,
  setLocale = setUserLocaleAction,
}: AccountMenuProps) {
  const t = useTranslations("shell.account");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  usePopoverDismiss(open, () => setOpen(false), button, panel);
  const ini = initials(name, locale);
  const bizIni = initials(business.name, locale);

  // Idioma da tela (ADR-0010): guarda na conta e relê a página no servidor, que já responde no idioma novo.
  function chooseLocale(next: Locale) {
    if (next === locale || pendingLocale) return;
    setPendingLocale(next);
    startTransition(async () => {
      const result = await setLocale(next);
      if (result.ok) router.refresh();
      else onNotice?.(t("languageError"));
      setPendingLocale(null);
    });
  }
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
            {/* Idioma do negócio: a API ainda não guarda nem devolve (pedido à S2b); por ora, o aviso padrão. */}
            <button type="button" className="sb-bz" onClick={() => { setOpen(false); onUnavailable(); }}>
              <span className="sb-bz-ic" aria-hidden="true">
                <svg className="sb-ic" viewBox="0 0 18 18">
                  <path d={PRODUCT_ICONS.globe} />
                </svg>
              </span>
              <span className="sb-bz-t">
                <b>{t("businessLanguage")}</b>
                <small>{t("businessLanguageSub")}</small>
              </span>
            </button>
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
          <div className="sb-acc-s" id="sb-acc-lang">
            {t("language")}
          </div>
          <div className="sb-biz-l" role="group" aria-labelledby="sb-acc-lang">
            {LOCALES.map((l) => {
              const on = l === (pendingLocale ?? locale);
              return (
                <button
                  key={l}
                  type="button"
                  lang={l}
                  className="sb-bz"
                  aria-pressed={on}
                  aria-label={t("languageOption", { language: tc(`localeNames.${l}`) })}
                  disabled={Boolean(pendingLocale)}
                  onClick={() => chooseLocale(l)}
                >
                  <span className="sb-bz-ic" aria-hidden="true">
                    {l.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="sb-bz-t">
                    <b>{tc(`localeNames.${l}`)}</b>
                  </span>
                  {on ? <Icon name="check" size={16} strokeWidth={2.2} /> : null}
                </button>
              );
            })}
          </div>
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
