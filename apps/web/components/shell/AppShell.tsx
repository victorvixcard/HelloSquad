"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { UserMenu } from "./UserMenu";

export const SIDEBAR_COOKIE = "hs_sb";

type AppShellProps = {
  workspace: { slug: string; name: string };
  user: { name: string; email: string };
  workspaces: Array<{ slug: string; name: string }>;
  initialCollapsed: boolean;
  children: ReactNode;
};

/** Casca da área logada: barra lateral V4.6 (recolhível; gaveta no celular), cabeçalho e conteúdo. */
export function AppShell({ workspace, user, workspaces, initialCollapsed, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  const restoreFocus = useRef(false);

  const closeDrawer = useCallback((returnFocus = true) => {
    // O foco volta ao botão depois do commit: antes disso o cabeçalho ainda está inert.
    restoreFocus.current = returnFocus;
    setDrawerOpen(false);
  }, []);

  // Navegou: a gaveta fecha.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) {
      if (restoreFocus.current) menuButtonRef.current?.focus();
      restoreFocus.current = false;
      return;
    }
    firstLinkRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen, closeDrawer]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    // Lembrado por cookie para o servidor já desenhar a barra no estado certo (sem pulo).
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "min" : "full"}; path=/app; max-age=31536000; samesite=lax`;
  }

  return (
    <div className={`ps${collapsed ? " is-min" : ""}${drawerOpen ? " is-drawer" : ""}`}>
      <a className="hs-skip" href="#conteudo">
        Pular para o conteúdo
      </a>
      <Sidebar
        slug={workspace.slug}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        onCloseDrawer={() => closeDrawer()}
        firstLinkRef={firstLinkRef}
      />
      <div className="ps-scrim" aria-hidden="true" onClick={() => closeDrawer(false)} />
      <div className="ps-main" inert={drawerOpen || undefined}>
        <header className="ps-head">
          <button
            ref={menuButtonRef}
            type="button"
            className="sb-ib ps-menu-btn"
            aria-label="Abrir o menu"
            aria-expanded={drawerOpen}
            aria-controls="barra-lateral"
            onClick={() => setDrawerOpen(true)}
          >
            <svg className="hs-nav-ic" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M3 5h12 M3 9h12 M3 13h12" />
            </svg>
          </button>
          <div className="ps-ws">
            <small>Negócio</small>
            <b data-testid="workspace-name">{workspace.name}</b>
          </div>
          <UserMenu name={user.name} email={user.email} currentSlug={workspace.slug} workspaces={workspaces} />
        </header>
        <main id="conteudo" className="ps-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
