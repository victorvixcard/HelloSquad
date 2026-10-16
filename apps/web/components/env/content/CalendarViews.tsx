"use client";

import { Agent, PRODUCT_ICONS, STATUS_GLYPHS, type AgentId, type ProductIconName } from "@hellosquad/ui";
import { useLocale, useTranslations } from "next-intl";
import { dateOf, isoWeek, mondayOf, shortDate, weekdayHead, weekdayOf, weekRangeParts, type CalendarPost, type Sk } from "./calendar";

/** Um post do calendário pronto para a tela (rótulos do catálogo, sinal da V4.6). */
export type CalItem = {
  id: string;
  post: CalendarPost;
  d: number;
  sk: Sk;
  /** Rótulo curto do estado ("Aguarda você", "Aprovado"…). */
  stL: string;
  /** Frase do estado ("v1 aguarda a sua aprovação"…), como `stS` da V4.6. */
  stS: string;
  channel: string;
  format: string;
  time: string | null;
  date: string;
  owner: AgentId;
  who: string;
};

export type View = "week" | "month" | "list";

const CHANNEL_ICON: Record<string, ProductIconName> = { instagram: "insta", whatsapp: "wa", email: "mail" };

export function Glyph({ sk }: { sk: Sk }) {
  const g = STATUS_GLYPHS[sk];
  return (
    <svg className={`wk-sg is-${sk}`} viewBox="0 0 16 16" aria-hidden="true">
      <circle className="g-o" cx="8" cy="8" r="6.2" />
      {g.fill ? <path className="g-f" d={g.fill} /> : null}
      {g.mark ? <path className="g-m" d={g.mark} /> : null}
    </svg>
  );
}

export function StatusPill({ sk, label }: { sk: Sk; label: string }) {
  return (
    <span className={`wk-st ct-st is-${sk}`}>
      <Glyph sk={sk} />
      <span>{label}</span>
    </span>
  );
}

export function OwnerFace({ agent, size }: { agent: AgentId; size: number }) {
  return <Agent agent={agent} size={size} expression="oval" />;
}

type ViewProps = {
  items: CalItem[];
  sel: string | null;
  today: number;
  onPick: (id: string) => void;
  onTalk: (item: CalItem) => void;
  nar: boolean;
  tight: boolean;
};

function useAria() {
  const t = useTranslations("editorial");
  return (x: CalItem, isSel: boolean) =>
    [x.post.theme, x.date, x.time, x.format, x.stS].filter(Boolean).join(", ") + `. ${isSel ? t("selected") : t("select")}`;
}

/** Semana da V4.6: sete colunas, "hoje" marcado, cartões de publicação com estado, título e "9h · Post". */
export function WeekView({ items, sel, today, onPick, onTalk, nar, tight, ws }: ViewProps & { ws: number }) {
  const t = useTranslations("editorial");
  const locale = useLocale();
  const aria = useAria();
  const days = Array.from({ length: 7 }, (_, i) => ws + i);
  return (
    <div className={`ct-wk${nar ? " is-nar" : ""}${tight ? " is-tight" : ""}`}>
      {days.map((d) => {
        const wd = weekdayOf(d);
        const its = items.filter((x) => x.d === d);
        return (
          <div key={d} className={`ct-day${d === today ? " is-now" : ""}${wd === 0 || wd === 6 ? " is-we" : ""}${d < today ? " is-past" : ""}`}>
            <div className="ct-dh">
              <span>{weekdayHead(d, locale)}</span>
              <b>{dateOf(d).getUTCDate()}</b>
              {d === today ? <i>{t("dayNow")}</i> : null}
            </div>
            <div className="ct-db">
              {its.map((x) => {
                const isSel = sel === x.id;
                return (
                  <div key={x.id} className="ct-pw">
                    <button
                      type="button"
                      className={`ct-pc is-${x.sk}${isSel ? " is-sel" : ""}`}
                      data-cid={x.id}
                      aria-pressed={isSel}
                      aria-label={aria(x, isSel)}
                      onClick={() => onPick(x.id)}
                    >
                      <StatusPill sk={x.sk} label={x.stL} />
                      <span className="ct-pt">{x.post.theme}</span>
                      <span className="ct-pm">
                        <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                          <path d={PRODUCT_ICONS[CHANNEL_ICON[x.post.channel] ?? "globe"]} />
                        </svg>
                        <span>{[x.time, x.format].filter(Boolean).join(" · ")}</span>
                      </span>
                    </button>
                    {isSel ? (
                      <button
                        type="button"
                        className="ct-qtalk"
                        aria-label={t("quickTalk", { title: x.post.theme })}
                        data-tip={t("quickTalkTip")}
                        onClick={() => onTalk(x)}
                      >
                        <svg className="sb-ic" viewBox="0 0 18 18" aria-hidden="true">
                          <path d={PRODUCT_ICONS.ask} />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Mês da V4.6: grade "SEG … DOM", até 3 por dia e "+N". */
export function MonthView({ items, sel, today, onPick, nar, grid }: ViewProps & { grid: { first: number; last: number; g0: number; g1: number } }) {
  const t = useTranslations("editorial");
  const locale = useLocale();
  const aria = useAria();
  const cells: number[] = [];
  for (let d = grid.g0; d <= grid.g1; d += 1) cells.push(d);
  return (
    <div className={`ct-mo${nar ? " is-nar" : ""}`}>
      <div className="ct-mo-h" aria-hidden="true">
        {cells.slice(0, 7).map((d) => (
          <span key={d}>{weekdayHead(d, locale)}</span>
        ))}
      </div>
      <div className="ct-mo-g">
        {cells.map((d) => {
          const its = items.filter((x) => x.d === d);
          const wd = weekdayOf(d);
          return (
            <div
              key={d}
              className={`ct-cell${d === today ? " is-now" : ""}${d < grid.first || d > grid.last ? " is-out" : ""}${wd === 0 || wd === 6 ? " is-we" : ""}`}
            >
              <span className="ct-cd">{dateOf(d).getUTCDate()}</span>
              {its.slice(0, 3).map((x) => {
                const isSel = sel === x.id;
                return (
                  <button
                    key={x.id}
                    type="button"
                    className={`ct-mi is-post is-${x.sk}${isSel ? " is-sel" : ""}`}
                    data-cid={x.id}
                    aria-pressed={isSel}
                    aria-label={aria(x, isSel)}
                    onClick={() => onPick(x.id)}
                  >
                    <span className="ct-mt">{x.post.theme}</span>
                  </button>
                );
              })}
              {its.length > 3 ? <span className="ct-more">{t("more", { n: its.length - 3 })}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Lista da V4.6: grupos "Semana N · intervalo" (+ "esta semana") com data, título + canal, estado e quem. */
export function ListView({ items, sel, today, onPick }: ViewProps) {
  const t = useTranslations("editorial");
  const tc = useTranslations("content");
  const locale = useLocale();
  const aria = useAria();
  const groups: Array<{ k: number; items: CalItem[] }> = [];
  for (const x of items) {
    const k = mondayOf(x.d);
    let g = groups.find((q) => q.k === k);
    if (!g) {
      g = { k, items: [] };
      groups.push(g);
    }
    g.items.push(x);
  }
  groups.sort((a, b) => a.k - b.k);
  const now = mondayOf(today);
  return (
    <div className="ct-list">
      {groups.map((g) => {
        const r = weekRangeParts(g.k, locale);
        const range = r.sameMonth ? tc("rangeSame", { from: r.from, to: r.to, month: r.month }) : tc("rangeCross", { from: r.from, monthFrom: r.monthFrom, to: r.to, month: r.month });
        const label = t("weekGroup", { n: isoWeek(g.k), range });
        return (
          <section key={g.k} className={`ct-lg${g.k === now ? " is-now" : ""}`} aria-label={label}>
            <header className="ct-lg-h">
              <span className="ps-k">{label}</span>
              {g.k === now ? <i>{t("thisWeek")}</i> : null}
            </header>
            {g.items.map((x) => {
              const isSel = sel === x.id;
              return (
                <button
                  key={x.id}
                  type="button"
                  className={`ct-row is-post${isSel ? " is-sel" : ""}`}
                  data-cid={x.id}
                  aria-pressed={isSel}
                  aria-label={aria(x, isSel)}
                  onClick={() => onPick(x.id)}
                >
                  <span className="ct-r-d">{shortDate(x.d, locale)}</span>
                  <span className="ct-r-th">
                    <OwnerFace agent={x.owner} size={22} />
                  </span>
                  <span className="ct-r-t">
                    <b>{x.post.theme}</b>
                    <small>{`${x.channel} · ${x.format}`}</small>
                  </span>
                  <StatusPill sk={x.sk} label={x.stL} />
                  <span className="ct-r-who">{x.who}</span>
                </button>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
