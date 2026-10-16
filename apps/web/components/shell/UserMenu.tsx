"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { signOut } from "@/lib/auth-actions";

type UserMenuProps = {
  name: string;
  email: string;
  currentSlug?: string;
  workspaces?: Array<{ slug: string; name: string }>;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 1);
  return letters.toUpperCase();
}

/** Menu da pessoa: quem está usando, troca de negócio e Sair (POST). Esc fecha e devolve o foco. */
export function UserMenu({ name, email, currentSlug, workspaces = [] }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const first = popRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!popRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }

  function onMenuKey(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(popRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  const others = workspaces.length > 1 ? workspaces : [];
  return (
    <div className="um">
      <button
        ref={buttonRef}
        type="button"
        className="um-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Sua conta: ${name}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="um-av" aria-hidden="true">
          {initials(name)}
        </span>
        <span className="um-t" aria-hidden="true">
          <b>{name}</b>
          <small>{email}</small>
        </span>
      </button>
      {open ? (
        <div ref={popRef} className="um-pop" id={menuId} role="menu" aria-label="Sua conta" onKeyDown={onMenuKey}>
          <div className="um-id" role="none">
            <b>{name}</b>
            <small>{email}</small>
          </div>
          {others.length ? (
            <>
              <p className="um-sec" role="none">
                Seus negócios
              </p>
              {others.map((ws) => (
                <Link
                  key={ws.slug}
                  role="menuitem"
                  className="um-item"
                  href={`/app/${ws.slug}`}
                  aria-current={ws.slug === currentSlug ? "page" : undefined}
                  onClick={() => close(false)}
                >
                  {ws.name}
                </Link>
              ))}
            </>
          ) : null}
          <Link role="menuitem" className="um-item" href="/app/novo-workspace" onClick={() => close(false)}>
            Adicionar um negócio
          </Link>
          <form action={signOut} role="none">
            <button type="submit" role="menuitem" className="um-item">
              Sair
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
