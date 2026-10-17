"use client";

import { Button, Icon as DsIcon } from "@hellosquad/ui";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./ui";

/**
 * Faixa "Verificação em duas etapas desligada" (SA0, em todas as páginas enquanto `mfa_enforced` for false; mesmo
 * desenho da faixa "Precisa de você" da V4.6). Abre o diálogo que explica como vai funcionar; nada é ativado aqui.
 */
export function TwoFactorBand() {
  const t = useTranslations("admin.twofa");
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="sa-band">
        <button type="button" className="sa-band-b" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          <span className="sa-band-k">
            <i aria-hidden="true" />
            <span>{t("kicker")}</span>
          </span>
          <span className="sa-band-t">{t("title")}</span>
          <span className="sa-band-s">{t("sub")}</span>
          <span className="sa-band-l">
            {t("cta")}
            <Icon name="arrowR" />
          </span>
        </button>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title={t("dialogTitle")} desc={t("dialogDesc")} closeLabel={t("close")}
        footer={
          <>
            <span className="sa-grow">{t("notYet")}</span>
            <Button variant="primary" size="s" onClick={() => setOpen(false)} data-autofocus>
              {t("ok")}
            </Button>
          </>
        }
      >
        <ol className="sa-list">
          {(["1", "2", "3"] as const).map((n) => (
            <li key={n} className="sa-li">
              <span className="sa-biz" aria-hidden="true">
                {n}
              </span>
              <span className="sa-li-t">
                <b>{t(`step${n}`)}</b>
                <small>{t(`step${n}Sub`)}</small>
              </span>
            </li>
          ))}
        </ol>
      </Dialog>
    </>
  );
}

/** Diálogo do SA0: foco preso, Esc fecha e devolve o foco a quem abriu. */
export function Dialog(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  desc?: string;
  closeLabel: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { open, onClose, title, desc, closeLabel, footer, children } = props;
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusFirst = setTimeout(() => {
      const el = ref.current;
      (el?.querySelector<HTMLElement>("[data-autofocus]") ?? el?.querySelector<HTMLElement>("button"))?.focus();
    }, 20);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const focusable = Array.from(
        ref.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex='-1'])"),
      );
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      clearTimeout(focusFirst);
      document.removeEventListener("keydown", onKey, true);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="sa-ovl" onMouseDown={(e) => e.target === e.currentTarget && closeRef.current()}>
      <div className="sa-dlg" role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} ref={ref}>
        <div className="sa-dlg-h">
          <div>
            <h2 id={`${id}-t`}>{title}</h2>
            {desc ? <p>{desc}</p> : null}
          </div>
          <button
            type="button"
            className="hs-ib hs-ib--ghost"
            aria-label={closeLabel}
            title={closeLabel}
            onClick={() => closeRef.current()}
          >
            <DsIcon name="close" size={18} className="hs-ico hs-ico--close" />
          </button>
        </div>
        <div className="sa-dlg-b">{children}</div>
        {footer ? <div className="sa-dlg-f">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
