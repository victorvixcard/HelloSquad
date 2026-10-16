"use client";

import { PRODUCT_ICONS } from "@hellosquad/ui";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { usePopoverDismiss } from "./Popover";

/** Sino do pé da barra. Ainda não há fonte de notificações na API: o painel abre vazio, sem ponto. */
export function Notifications() {
  const t = useTranslations("shell.notifications");
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  usePopoverDismiss(open, () => setOpen(false), button, panel);
  return (
    <div className="sb-notw">
      <button
        ref={button}
        type="button"
        className="sb-ib"
        aria-label={t("aria")}
        aria-expanded={open}
        data-tip={t("label")}
        onClick={() => setOpen((v) => !v)}
      >
        <svg className="sb-ic i-bell" viewBox="0 0 18 18" aria-hidden="true">
          <path d={PRODUCT_ICONS.bell} />
        </svg>
      </button>
      {open ? (
        <div ref={panel} className="ps-pop ps-pop-not sb-pop-not" role="dialog" aria-label={t("label")}>
          <div className="ps-pop-h">{t("label")}</div>
          <p className="ps-pop-e">{t("empty")}</p>
        </div>
      ) : null}
    </div>
  );
}
