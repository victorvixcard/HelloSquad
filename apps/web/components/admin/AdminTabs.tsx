"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type AdminTab = { id: string; label: string; panel: ReactNode };

/**
 * Abas do SA0 (segmentado da V4.6 com papel de aba): setas, Home e End; a aba aberta fica no endereço (#custos), para
 * voltar a ela e compartilhar. Os painéis chegam prontos do servidor; a troca é só de qual aparece.
 */
export function AdminTabs({ tabs, label, idPrefix }: { tabs: AdminTab[]; label: string; idPrefix: string }) {
  const ids = tabs.map((t) => t.id);
  const [value, setValue] = useState(ids[0] ?? "");
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const read = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (ids.includes(hash)) setValue(hash);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
    // ids vem do servidor e não muda na vida do componente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (id: string, focus = false) => {
    setValue(id);
    window.history.replaceState(null, "", `#${id}`);
    if (focus) refs.current[id]?.focus();
  };

  return (
    <>
      <div className="sa-tabs-w">
        <div className="sa-tabs" role="tablist" aria-label={label}>
          {tabs.map((tab, i) => {
            const on = tab.id === value;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  refs.current[tab.id] = el;
                }}
                type="button"
                role="tab"
                id={`${idPrefix}-tab-${tab.id}`}
                aria-selected={on}
                aria-controls={`${idPrefix}-panel-${tab.id}`}
                tabIndex={on ? 0 : -1}
                className="sa-tab"
                onClick={() => choose(tab.id)}
                onKeyDown={(e) => {
                  const n = tabs.length;
                  const j =
                    e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null;
                  if (j === null) return;
                  e.preventDefault();
                  choose(tabs[j]!.id, true);
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${idPrefix}-panel-${tab.id}`}
          aria-labelledby={`${idPrefix}-tab-${tab.id}`}
          tabIndex={0}
          hidden={tab.id !== value}
          className="sa-tabp"
        >
          {tab.panel}
        </div>
      ))}
    </>
  );
}
