"use client";

import { Agent, AGENT_IDS, getAgent, type AgentId } from "@hellosquad/ui";
import { useEffect, useRef, useState } from "react";

export type SquadStatusKind = "idle" | "tech" | "work" | "wait" | "live" | "done";

const EXPR: Partial<Record<SquadStatusKind, "big" | "happy">> = { wait: "big", done: "happy" };
const KIND_CLASS: Partial<Record<SquadStatusKind, string>> = { tech: "is-tech", work: "is-work", wait: "is-wait", live: "is-live" };

type Slot = { m: string; d: string; c: "is-on" | "is-off" | "is-reset" };

/**
 * Status vivo do squad (`HelloSquad.SquadStatus` do DS, bundle.js L208), com a mesma marcação e classes
 * (`hs-live`, `hs-slot`, `hs-live-orbit`, `hs-live-msg`, `hs-live-bar`): quem conduz entra no lugar de quem saiu
 * e o texto troca por dois trilhos. O CSS vem do bundle do DS (ds-bundle.css). `tech` = estado técnico, sem agente.
 */
export function SquadStatus({
  kind,
  lead,
  message,
  detail,
}: {
  kind: SquadStatusKind;
  lead: AgentId | null;
  message: string;
  detail?: string;
}) {
  const who = kind === "tech" || kind === "idle" ? null : (lead ?? "nexo");
  const key = `${message}|${detail ?? ""}`;
  const [slots, setSlots] = useState<{ a: Slot; b: Slot; cur: "a" | "b"; key: string }>({
    a: { m: message, d: detail ?? "", c: "is-on" },
    b: { m: "", d: "", c: "is-off" },
    cur: "a",
    key,
  });
  const [out, setOut] = useState<AgentId | null>(null);
  const prev = useRef<AgentId | null>(who);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (prev.current && prev.current !== who) {
      setOut(prev.current);
      timers.current.push(setTimeout(() => setOut(null), 420));
    }
    prev.current = who;
  }, [who]);
  useEffect(() => {
    if (key === slots.key) return;
    const cur = slots.cur;
    const other = cur === "a" ? "b" : "a";
    setSlots({ ...slots, [other]: { m: message, d: detail ?? "", c: "is-reset" }, key });
    timers.current.push(
      setTimeout(() => {
        setSlots((s) => ({ ...s, cur: other, [other]: { ...s[other], c: "is-on" }, [cur]: { ...s[cur], c: "is-off" } }));
      }, 30),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- troca só quando o texto muda
  }, [key]);

  const x = EXPR[kind] ?? "oval";
  const cls = ["hs-live", KIND_CLASS[kind], `x-${x}`, who ? `ag-${getAgent(who).shape}` : null].filter(Boolean).join(" ");
  const text = (slot: Slot, k: string) => (
    <span key={k} className={`hs-live-t ${slot.c}`}>
      {slot.m}
      {slot.d ? (
        <>
          {" "}
          <i>{slot.d}</i>
        </>
      ) : null}
    </span>
  );
  return (
    <div className={cls} role="status" aria-live="polite">
      <span className="hs-live-av">
        <span className={`hs-slot hs-tech${who ? "" : " is-lead"}`}>
          <span />
        </span>
        {AGENT_IDS.map((id) => (
          <span key={id} className={`hs-slot${who === id ? " is-lead" : ""}${out === id && who !== id ? " is-out" : ""}`}>
            <Agent agent={id} size={32} expression={who === id ? x : "oval"} />
          </span>
        ))}
        <span className="hs-live-orbit" />
      </span>
      <span className="hs-live-msg">
        {text(slots.a, "a")}
        {text(slots.b, "b")}
      </span>
      <span className="hs-live-end">{kind === "live" ? <span className="hs-pulse" style={{ marginRight: 6 }} /> : null}</span>
      <span className="hs-live-bar" />
    </div>
  );
}
