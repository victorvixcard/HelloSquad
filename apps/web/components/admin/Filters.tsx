"use client";

import { Agent, CommandField, Icon, type AgentId } from "@hellosquad/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

/** Troca um parâmetro da URL do painel e volta à primeira página (o cursor da lista anterior não vale mais). */
function useQueryParam(name: string) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const set = (value: string | null) => {
    const next = new URLSearchParams(params?.toString() ?? "");
    next.delete("cursor");
    if (value) next.set(name, value);
    else next.delete(name);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : (pathname ?? ""));
  };
  return { value: params?.get(name) ?? "", set };
}

export type SelectOption = { value: string; label: string; agent?: AgentId };

/**
 * Seletor do SA0: `Select` + `Menu` do DS (setas, Esc devolve o foco). A escolha vai para a URL (`?plan=squad`), e a
 * lista vem filtrada da API; "Todos" tira o parâmetro.
 */
export function FilterSelect(props: { name: string; title: string; prefix?: string; options: SelectOption[]; right?: boolean }) {
  const { value, set } = useQueryParam(props.name);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const current = props.options.find((o) => o.value === value) ?? props.options[0]!;
  const button = () => wrap.current?.querySelector<HTMLButtonElement>(".hs-select");

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    const focus = setTimeout(() => {
      (wrap.current?.querySelector<HTMLElement>('.hs-mi[aria-checked="true"]') ?? wrap.current?.querySelector<HTMLElement>(".hs-mi"))?.focus();
    }, 20);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      clearTimeout(focus);
    };
  }, [open]);

  const onKey = (e: KeyboardEvent) => {
    if (!open) return;
    const items = Array.from(wrap.current?.querySelectorAll<HTMLElement>(".hs-mi") ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      button()?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(i + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Tab") setOpen(false);
  };

  const pick = (option: SelectOption) => {
    setOpen(false);
    button()?.focus();
    if (option.value !== value) set(option.value || null);
  };

  return (
    <div className="sa-dd" ref={wrap} onKeyDown={onKey}>
      <button
        type="button"
        className={`hs-select${open ? " is-open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {current.agent ? <Agent agent={current.agent} size={22} /> : null}
        {props.prefix ? `${props.prefix}: ${current.label}` : current.label}
        <span className="hs-chev">
          <Icon name="chev" size={16} strokeWidth={2} />
        </span>
      </button>
      {open ? (
        <div className={`sa-dd-pop${props.right ? " is-r" : ""}`}>
          <div className="hs-menu" role="menu" aria-label={props.title}>
            <div className="hs-menu-h">{props.title}</div>
            {props.options.map((option) => {
              const selected = option.value === current.value;
              return (
                <div
                  key={option.value || "all"}
                  role="menuitemradio"
                  aria-checked={selected}
                  tabIndex={0}
                  className="hs-mi"
                  onClick={() => pick(option)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      pick(option);
                    }
                  }}
                >
                  {option.agent ? <Agent agent={option.agent} size={20} /> : null}
                  {option.label}
                  <span className="hs-end">
                    {selected ? (
                      <span style={{ color: "var(--hs-tinta)" }}>
                        <Icon name="check" size={18} strokeWidth={2.2} />
                      </span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Busca do SA0: o campo de comando do DS, sem o envio; filtra enquanto digita (a API busca), Esc limpa. */
export function FilterSearch({ name, label, placeholder }: { name: string; label: string; placeholder: string }) {
  const { value, set } = useQueryParam(name);
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const change = (next: string) => {
    setText(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => set(next.trim() || null), 350);
  };
  return (
    <div
      className="sa-search"
      style={{ flex: 1, minWidth: 260 }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && text) {
          e.preventDefault();
          change("");
        }
      }}
    >
      <CommandField value={text} onChange={change} onSend={(v) => set(v.trim() || null)} placeholder={placeholder} label={label} />
    </div>
  );
}
