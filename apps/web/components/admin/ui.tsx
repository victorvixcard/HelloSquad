import { Agent, type AgentExpression, type AgentId } from "@hellosquad/ui";
import type { ReactNode } from "react";
import { ADMIN_ICONS, type AdminIconName } from "./icons";

/*
 * Composições do Super Admin (protótipo SA0, design/super-admin-proto/app/shell.js), com as mesmas classes do
 * CSS portado (@hellosquad/ui/super-admin.css). Só apresentação, sem estado: servem às páginas do servidor.
 */

export function Icon({ name, className, size }: { name: AdminIconName; className?: string; size?: number }) {
  return (
    <svg
      className={`sa-ic${className ? ` ${className}` : ""}`}
      viewBox="0 0 18 18"
      aria-hidden="true"
      style={size ? { width: size, height: size } : undefined}
    >
      <path d={ADMIN_ICONS[name]} />
    </svg>
  );
}

/** "Um desenho por estado" da V4.6: Tinta = precisa de você; contorno = em andamento; Névoa = ok; coral = erro. */
export type StatusKind = "you" | "prog" | "done" | "pause" | "block" | "fail" | "draft";
const STATUS_GLYPH: Partial<Record<StatusKind, AdminIconName>> = {
  you: "alert",
  done: "okc",
  fail: "xx",
  pause: "pause",
  block: "lock",
};

export function Status({ kind = "prog", small, title, children }: { kind?: StatusKind; small?: boolean; title?: string; children: ReactNode }) {
  const glyph = STATUS_GLYPH[kind];
  return (
    <span className={`sa-st is-${kind}${small ? " is-s" : ""}`} title={title}>
      {glyph ? (
        <svg viewBox="0 0 18 18" aria-hidden="true">
          <path d={ADMIN_ICONS[glyph]} />
        </svg>
      ) : null}
      {children}
    </span>
  );
}

/** `Tag` do DS: ok, auto, you e sim (tracejada: provisório, exemplo). */
export function Tag({ kind = "auto", title, children }: { kind?: "ok" | "auto" | "you" | "sim"; title?: string; children: ReactNode }) {
  return (
    <span className={`hs-tag hs-tag--${kind}`} title={title}>
      {children}
    </span>
  );
}

export function Card(props: {
  id?: string;
  title?: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  flush?: boolean;
  flat?: boolean;
  h3?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const { id, title, sub, actions, flush, flat, h3, className, children } = props;
  const Heading = h3 ? "h3" : "h2";
  return (
    <section
      id={id}
      className={`sa-card${flat ? " is-flat" : ""}${className ? ` ${className}` : ""}`}
      aria-labelledby={title && id ? `${id}-t` : undefined}
    >
      {title || actions ? (
        <div className="sa-card-h">
          <div className="sa-card-t">
            {title ? <Heading id={id ? `${id}-t` : undefined}>{title}</Heading> : null}
            {sub ? <small>{sub}</small> : null}
          </div>
          {actions ? <div className="sa-card-a">{actions}</div> : null}
        </div>
      ) : null}
      <div className={`sa-card-b${flush ? " is-flush" : ""}`}>{children}</div>
    </section>
  );
}

export type Metric = { label: string; value: ReactNode; unit?: ReactNode; detail?: ReactNode; tag?: ReactNode; kind?: "you" | "line" };

/** Cartões de número (Papel; o número em Gabarito 800). */
export function Metrics({ items, cols }: { items: Metric[]; cols?: number }) {
  return (
    <div className="sa-mets" style={cols ? { gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` } : undefined}>
      {items.map((m) => (
        <div key={m.label} className={`sa-met${m.kind ? ` is-${m.kind}` : ""}`}>
          <div className="sa-met-l">
            <span className="sa-lbl">{m.label}</span>
            {m.tag ?? null}
          </div>
          <div className="sa-met-v">
            {m.value}
            {m.unit ? <small>{m.unit}</small> : null}
          </div>
          {m.detail ? <div className="sa-met-d">{m.detail}</div> : null}
        </div>
      ))}
    </div>
  );
}

export function Note({ kind, label, children }: { kind?: "draft" | "warn"; label?: string; children: ReactNode }) {
  return (
    <div className={`sa-note${kind ? ` is-${kind}` : ""}`} role={kind === "warn" ? "note" : undefined}>
      {label ? <span className="sa-lbl">{label}</span> : null}
      <div>{children}</div>
    </div>
  );
}

export function Empty(props: { agent?: AgentId; expression?: AgentExpression; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="sa-empty">
      {props.agent ? <Agent agent={props.agent} size={40} expression={props.expression ?? "sleep"} /> : null}
      <b>{props.title}</b>
      {props.children ? <span>{props.children}</span> : null}
      {props.actions ? <div className="sa-empty-a">{props.actions}</div> : null}
    </div>
  );
}

export type Column<T> = {
  key: string;
  label: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "r" | "c";
  nowrap?: boolean;
  width?: number | string;
};

/** Tabela do SA0: cabeçalho em mono 10 px, linhas separadas por L1; a célula principal leva o link (teclado). */
export function DataTable<T>(props: {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty: ReactNode;
  foot?: ReactNode;
}) {
  const cls = (c: Column<T>) => [c.align && `is-${c.align}`, c.nowrap && "is-nw"].filter(Boolean).join(" ") || undefined;
  return (
    <div className="sa-tblw">
      <table className="sa-tbl">
        <caption className="sa-sr">{props.caption}</caption>
        <thead>
          <tr>
            {props.columns.map((c) => (
              <th key={c.key} scope="col" className={cls(c)} style={c.width ? { width: c.width } : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.length ? (
            props.rows.map((row) => (
              <tr key={props.rowKey(row)}>
                {props.columns.map((c) => (
                  <td key={c.key} className={cls(c)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={props.columns.length} className="sa-tbl-empty">
                {props.empty}
              </td>
            </tr>
          )}
        </tbody>
        {props.foot ? <tfoot>{props.foot}</tfoot> : null}
      </table>
    </div>
  );
}

const CHECK = "M3.8 9.4 L7.4 13 L14.4 5.2";

/**
 * Trava de leitura ("preço aprovado comercialmente", "à venda"): o `Checkbox` do DS, marcado ou não, sem ação nesta
 * fase. Continua focável para quem navega por teclado ouvir o estado e o motivo.
 */
export function LockedCheck({ checked, label, title }: { checked: boolean; label: string; title: string }) {
  return (
    <span className="sa-cb-off" title={title}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-disabled="true"
        aria-label={`${label} (${title})`}
        className={`hs-cb${checked ? " is-on" : ""}`}
      >
        <span className="hs-cb-box">
          {checked ? (
            <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden="true" className="sa-cb-check">
              <path d={CHECK} />
            </svg>
          ) : null}
        </span>
      </button>
    </span>
  );
}

/** Ação que existe no desenho do SA0 mas só chega numa fatia futura: botão desabilitado e o motivo ao lado. */
export function SoonButton({ label, reason }: { label: string; reason: string }) {
  return (
    <button type="button" className="hs-btn hs-btn--soft hs-btn--s" disabled aria-disabled="true" title={reason}>
      {label}
    </button>
  );
}

/** Valor ausente na API: "—", nunca zero nem texto inventado. */
export function Dash({ label }: { label: string }) {
  return <span className="sa-mut">{label}</span>;
}

/** Agente mini do DS com o nome (catálogo, fila, regras por tarefa). */
export function AgentLabel({ agent, name }: { agent: AgentId; name: string }) {
  return (
    <span className="sa-agl">
      <Agent agent={agent} size={18} />
      <span>{name}</span>
    </span>
  );
}

/** A API do painel não respondeu: diz o que houve, sem dado inventado no lugar. */
export function ApiProblem({ label, message }: { label: string; message: string }) {
  return (
    <Note kind="warn" label={label}>
      {message}
    </Note>
  );
}

/** Paginação por cursor (`next_cursor` da API): "Próxima página" e, depois dela, "Voltar ao início". */
export function Pager(props: { nextHref: string | null; firstHref: string | null; nextLabel: string; firstLabel: string }) {
  if (!props.nextHref && !props.firstHref) return null;
  return (
    <div className="sa-pager">
      {props.firstHref ? (
        <a className="hs-btn hs-btn--ghost hs-btn--s" href={props.firstHref}>
          <span className="hs-lbl">{props.firstLabel}</span>
        </a>
      ) : null}
      {props.nextHref ? (
        <a className="hs-btn hs-btn--soft hs-btn--s" href={props.nextHref} rel="next">
          <span className="hs-lbl">{props.nextLabel}</span>
        </a>
      ) : null}
    </div>
  );
}
