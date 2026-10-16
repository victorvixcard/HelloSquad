"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";

/** Fecha com Esc (devolvendo o foco ao botão que abriu) e com clique fora, como os popovers da V4.6. */
export function usePopoverDismiss(
  open: boolean,
  close: () => void,
  anchor: RefObject<HTMLElement | null>,
  panel: RefObject<HTMLElement | null>,
) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      closeRef.current();
      anchor.current?.focus();
    };
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) || anchor.current?.contains(target)) return;
      closeRef.current();
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, anchor, panel]);
}

export function PopoverHeading({ children }: { children: ReactNode }) {
  return <div className="ps-pop-h">{children}</div>;
}
