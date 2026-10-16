"use client";

import { Agent, getAgent, type AgentId } from "@hellosquad/ui";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

export type Suggestion = { t: string; ags: AgentId[] };

/** Faixa de sugestões do Início V3: passa sozinha; para no cursor e no foco; sem movimento com movimento reduzido. */
export function SuggestionBand({ items, selected, onPick }: { items: Suggestion[]; selected: string | null; onPick: (s: Suggestion) => void }) {
  const t = useTranslations("home");
  const track = useRef<HTMLDivElement>(null);
  const hold = useRef(false);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const set = el.querySelector<HTMLElement>(".hm-band-set:not(.is-dup)");
    let x = -(set?.offsetWidth ?? 0);
    el.style.transform = `translate3d(${x}px,0,0)`;
    if (reduce) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const w = set?.offsetWidth ?? 0;
      if (!hold.current && w > 0) {
        x -= dt * 0.028;
        if (x <= -2 * w) x += w;
        el.style.transform = `translate3d(${x}px,0,0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [items]);

  const chip = (c: Suggestion, dup: boolean) => {
    const multi = c.ags.length > 1;
    const names = c.ags.map((a) => getAgent(a).name);
    const who = c.ags.length === 1 ? t("chipOnly", { who: names[0] }) : t("chipMany", { who: names.join(t("and")) });
    const isSel = selected === c.t;
    return (
      <button
        key={`${dup ? "d" : "m"}-${c.t}`}
        type="button"
        className={`hm-chip${isSel ? " is-sel" : ""}`}
        tabIndex={dup ? -1 : undefined}
        aria-pressed={dup ? undefined : isSel}
        aria-label={t("chipAria", { text: c.t, who })}
        onClick={() => onPick(c)}
      >
        <span className={`hm-chip-av${multi ? " is-multi" : ""}`} aria-hidden="true">
          {c.ags.map((a) => (
            <Agent key={a} agent={a} size={18} outline={multi} />
          ))}
        </span>
        <span className="hm-chip-t">{c.t}</span>
      </button>
    );
  };

  return (
    <div
      className="hm-band"
      onMouseEnter={() => (hold.current = true)}
      onMouseLeave={() => (hold.current = false)}
      onFocus={() => (hold.current = true)}
      onBlur={() => (hold.current = false)}
    >
      <div className="hm-band-vp" role="group" aria-label={t("bandLabel")}>
        <div className="hm-band-tr" ref={track}>
          <div className="hm-band-set is-dup" aria-hidden="true">
            {items.map((c) => chip(c, true))}
          </div>
          <div className="hm-band-set">{items.map((c) => chip(c, false))}</div>
          <div className="hm-band-set is-dup" aria-hidden="true">
            {items.map((c) => chip(c, true))}
          </div>
        </div>
      </div>
    </div>
  );
}
