// Interpretador de Design Components (.dc.html) em React, com a semântica do runtime do protótipo (support.js):
// lacunas {{caminho}}, <sc-if>, <sc-for>, <x-import> (componentes do bundle do DS), estilo em texto aplicado como
// cssText, valor interpolado em <span class="sc-interp">, e a classe Component (DCLogic) com setState/ciclo de vida.
// Roda no servidor (o HTML já traz o texto de todas as seções) e no cliente (os motores ligam no componentDidMount).
// Diferença deliberada: sem os atributos data-dc-tpl (anotação do editor de design; nem o CSS nem a classe os usam).
import { Component as ReactComponent, createElement, Fragment, isValidElement, type ComponentType, type ReactNode } from "react";
import type { TplNode, TplProp } from "./template-types";

type Scope = Record<string, unknown>;

// ---------------------------------------------------------------- expressões (D/Bt do support.js)
const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*/;
const NUM = /^-?\d+(\.\d+)?$/;

function balanced(t: string): boolean {
  let n = 0;
  for (let e = 0; e < t.length - 1; e++) if (t[e] === "(") n++;
  else if (t[e] === ")" && (n--, n === 0)) return false;
  return true;
}

function findEq(t: string): { index: number; op: string } | null {
  let n = 0;
  for (let e = 0; e < t.length; e++) {
    const r = t[e];
    if (r === "[" || r === "(") n++;
    else if (r === "]" || r === ")") n--;
    else if (n === 0 && (r === "=" || r === "!") && t[e + 1] === "=") {
      if ((e > 0 && (t[e - 1] === "=" || t[e - 1] === "!")) || !t.slice(0, e).trim()) continue;
      return { index: e, op: t[e + 2] === "=" ? r + "==" : r + "=" };
    }
  }
  return null;
}

function path(scope: Scope | undefined, n: string): unknown {
  const e = n.match(IDENT);
  if (!e) return undefined;
  let r: unknown = scope?.[e[0]];
  let o = e[0].length;
  while (o < n.length) {
    if (n[o] === ".") {
      const s = n.slice(o + 1).match(IDENT) || n.slice(o + 1).match(/^\d+/);
      if (!s) return undefined;
      r = (r as Scope | undefined)?.[s[0]];
      o += 1 + s[0].length;
    } else if (n[o] === "[") {
      let s = 1;
      let i = o + 1;
      for (; i < n.length && s > 0; ) {
        if (n[i] === "[") s++;
        else if (n[i] === "]" && (s--, s === 0)) break;
        i++;
      }
      if (s !== 0) return undefined;
      const l = evaluate(scope, n.slice(o + 1, i)) as string;
      r = (r as Scope | undefined)?.[l];
      o = i + 1;
    } else return undefined;
  }
  return r;
}

export function evaluate(scope: Scope | undefined, raw: string): unknown {
  const e = String(raw).trim();
  if (!e) return undefined;
  if (e[0] === "(" && e[e.length - 1] === ")" && balanced(e)) return evaluate(scope, e.slice(1, -1));
  const r = findEq(e);
  if (r) {
    const o = evaluate(scope, e.slice(0, r.index));
    const s = evaluate(scope, e.slice(r.index + r.op.length));
    // eslint-disable-next-line eqeqeq
    return r.op === "===" ? o === s : r.op === "!==" ? o !== s : r.op === "==" ? o == s : o != s;
  }
  if (e[0] === "!") return !evaluate(scope, e.slice(1));
  if (e === "true") return true;
  if (e === "false") return false;
  if (e === "null") return null;
  if (e === "undefined") return undefined;
  if (NUM.test(e)) return Number(e);
  if (e.length >= 2 && (e[0] === '"' || e[0] === "'") && e[e.length - 1] === e[0]) return e.slice(1, -1);
  return path(scope, e);
}

/** Valor de um atributo: `{{x}}` inteiro devolve o valor cru (função, objeto…); texto misto vira string. */
function attr(raw: string, scope: Scope): unknown {
  const whole = raw.match(/^\s*\{\{([\s\S]+?)\}\}\s*$/);
  if (whole) return evaluate(scope, whole[1]!);
  if (raw.includes("{{")) return raw.split(/\{\{([\s\S]+?)\}\}/g).map((o, s) => (s & 1 ? (evaluate(scope, o) ?? "") : o)).join("");
  return raw;
}

// ---------------------------------------------------------------- estilo (st/mt/Ce/Re do support.js)
const camel = (t: string) => t.replace(/-([a-z])/g, (_n, e: string) => e.toUpperCase());

export function parseStyle(t: string): Record<string, string> {
  const n: Record<string, string> = {};
  for (const e of t.split(";")) {
    const r = e.indexOf(":");
    if (r < 0) continue;
    const o = e.slice(0, r).trim();
    n[o.startsWith("--") ? o : camel(o)] = e.slice(r + 1).trim();
  }
  return n;
}

const LAYOUT = new Set(["position", "left", "right", "top", "bottom", "inset", "width", "height", "z-index", "transform"]);
const kebab = (t: string) => (t.startsWith("--") ? t : t.replace(/[A-Z]/g, (n) => "-" + n.toLowerCase()));

function layoutStyle(v: unknown): Record<string, unknown> | undefined {
  const n = typeof v === "string" ? parseStyle(v) : v != null && typeof v === "object" ? (v as Record<string, unknown>) : null;
  if (!n) return undefined;
  const e: Record<string, unknown> = {};
  for (const [r, o] of Object.entries(n)) if (LAYOUT.has(kebab(r))) e[r] = o;
  return Object.keys(e).length ? e : undefined;
}

type StyledEl = HTMLElement & { __dcCss?: string };
const styleRefs = new Map<string, (el: StyledEl | null) => void>();

/**
 * Como o Re() do runtime: quando o estilo em texto muda, ele é aplicado inteiro (cssText, sem !important); quando o
 * estilo é objeto, só as chaves dele sobrevivem à limpeza. Ref estável por (texto, chaves), para o React não repetir.
 */
function styleRef(css: string | null, keys: string[]): (el: StyledEl | null) => void {
  const key = (css == null ? "none" : "css:" + css) + "\0" + keys.join(";");
  let fn = styleRefs.get(key);
  if (!fn) {
    fn = (el) => {
      if (!el || el.__dcCss === key) return;
      el.__dcCss = key;
      const o = el.style;
      const keep = keys.map((k) => [k, o.getPropertyValue(k)] as const);
      o.cssText = css ?? "";
      for (let i = o.length; i-- > 0; ) {
        const l = o[i]!;
        if (!o.getPropertyPriority(l)) continue;
        const c = o.getPropertyValue(l);
        o.removeProperty(l);
        if (c) o.setProperty(l, c);
      }
      for (const [k, v] of keep) if (v) o.setProperty(k, v);
    };
    if (styleRefs.size > 4096) styleRefs.clear();
    styleRefs.set(key, fn);
  }
  return fn;
}

// ---------------------------------------------------------------- tradução (pt-BR → idioma)
export type Translate = (s: string) => string;
const TR_ATTRS = new Set(["aria-label", "title", "placeholder", "alt", "label"]);

function trDeep(v: unknown, tr: Translate, depth = 0): unknown {
  if (typeof v === "string") return tr(v);
  if (depth > 2 || v == null || typeof v !== "object" || isValidElement(v)) return v;
  if (Array.isArray(v)) return v.map((x) => trDeep(x, tr, depth + 1));
  if (Object.getPrototypeOf(v) !== Object.prototype) return v;
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) out[k] = typeof x === "function" ? x : trDeep(x, tr, depth + 1);
  return out;
}

function trText(raw: string, tr: Translate): string {
  const t = raw.trim();
  if (!t) return raw;
  const r = tr(t);
  if (r === t) return raw;
  const lead = raw.slice(0, raw.indexOf(t[0]!));
  const tail = raw.slice(raw.lastIndexOf(t[t.length - 1]!) + 1);
  return lead + r + tail;
}

// ---------------------------------------------------------------- renderização da árvore
export interface RenderCtx {
  components: Record<string, ComponentType<Record<string, unknown>>>;
  tr: Translate;
}

function renderText(raw: string, scope: Scope, ctx: RenderCtx, key: number): ReactNode {
  if (!raw.includes("{{")) return ctx.tr === identity ? raw : trText(raw, ctx.tr);
  const parts = raw.split(/\{\{([\s\S]+?)\}\}/g);
  return createElement(
    Fragment,
    { key },
    ...parts.map((p, i) => {
      if (!(i & 1)) return ctx.tr === identity ? p : trText(p, ctx.tr);
      const c = evaluate(scope, p);
      if (c === undefined || c === null || typeof c === "boolean") return null;
      if (isValidElement(c) || Array.isArray(c)) return createElement(Fragment, { key: i }, c as ReactNode);
      return createElement("span", { key: i, className: "sc-interp" }, ctx.tr(String(c)));
    }),
  );
}

function renderProps(p: TplProp[], scope: Scope, ctx: RenderCtx, dom: boolean) {
  const props: Record<string, unknown> = {};
  let styleStr: string | null = null;
  for (const [name, raw] of p) {
    let v = raw === true ? true : attr(raw, scope);
    if (dom) {
      if (name === "style" && typeof v === "string") {
        styleStr = v;
        v = parseStyle(v);
      }
      if ((name === "value" || name === "checked") && v === undefined) v = name === "checked" ? false : "";
      if (typeof v === "string" && TR_ATTRS.has(name) && ctx.tr !== identity) v = ctx.tr(v);
    } else if (ctx.tr !== identity && typeof v !== "function") v = trDeep(v, ctx.tr);
    props[name] = v;
  }
  return { props, styleStr };
}

export function renderNodes(nodes: TplNode[], scope: Scope, ctx: RenderCtx): ReactNode[] {
  return nodes.map((node, key) => renderNode(node, scope, ctx, key));
}

function renderNode(node: TplNode, scope: Scope, ctx: RenderCtx, key: number): ReactNode {
  if (typeof node === "string") return renderText(node, scope, ctx, key);
  if (node.t === "if") return attr(node.v, scope) ? createElement(Fragment, { key }, ...renderNodes(node.c, scope, ctx)) : null;
  if (node.t === "for") {
    const list = attr(node.list, scope);
    const items = Array.isArray(list) ? list : [];
    return createElement(
      Fragment,
      { key },
      items.map((item, u) => createElement(Fragment, { key: u }, ...renderNodes(node.c, { ...scope, [node.as]: item, $index: u }, ctx))),
    );
  }
  if (node.t === "x") {
    const Comp = ctx.components[node.n];
    const host = node.s != null ? layoutStyle(attr(node.s, scope)) : undefined;
    if (!Comp) return createElement("div", { key, className: "sc-host-x", style: host ?? { display: "contents" } });
    const { props } = renderProps(node.p, scope, ctx, false);
    const children = node.c.length ? renderNodes(node.c, scope, ctx) : undefined;
    return createElement("div", { key, className: "sc-host-x", style: host ?? { display: "contents" } }, createElement(Comp, props, ...(children ?? [])));
  }
  const { props, styleStr } = renderProps(node.p, scope, ctx, true);
  props.key = key;
  const objKeys = styleStr == null && props.style && typeof props.style === "object" ? Object.keys(props.style).map(kebab).sort() : [];
  props.ref = styleRef(styleStr, objKeys);
  return createElement(node.tag, props, ...renderNodes(node.c, scope, ctx));
}

export const identity: Translate = (s) => s;

// ---------------------------------------------------------------- DCLogic e o hospedeiro
interface Host {
  __setLogicState(partial: unknown, cb?: () => void): void;
  forceUpdate(): void;
}

/** A base que a classe Component do protótipo estende (a mesma API do support.js). */
export class DCLogic {
  props: Record<string, unknown>;
  state: Record<string, unknown> = {};
  __host?: Host;
  constructor(props?: Record<string, unknown>) {
    this.props = props || {};
  }
  setState(partial: unknown, cb?: () => void) {
    this.__host?.__setLogicState(partial, cb);
  }
  forceUpdate() {
    this.__host?.forceUpdate();
  }
  componentDidMount() {}
  componentDidUpdate(_prev: Record<string, unknown>) {}
  componentWillUnmount() {}
  renderVals(): Record<string, unknown> {
    return {};
  }
}

export type LogicClass = new (props: Record<string, unknown>) => DCLogic;

export interface DCHostProps {
  name: string;
  Logic: LogicClass;
  template: TplNode[];
  ctx: RenderCtx;
  userProps?: Record<string, unknown>;
}

/** O equivalente ao componente que o support.js monta para cada .dc.html: <div class="sc-host"> + template. */
export class DCHost extends ReactComponent<DCHostProps, { v: number }> {
  logic: DCLogic;
  state = { v: 0 };
  constructor(props: DCHostProps) {
    super(props);
    this.logic = new props.Logic(props.userProps ?? {});
    this.logic.__host = this;
  }
  __setLogicState(partial: unknown, cb?: () => void) {
    const prev = this.logic.state;
    const u = typeof partial === "function" ? (partial as (s: unknown) => object)(prev) : partial;
    this.logic.state = { ...prev, ...(u as object) };
    this.setState((d) => ({ v: d.v + 1 }), cb);
  }
  componentDidMount() {
    try {
      this.logic.componentDidMount();
    } catch (e) {
      console.error(e);
    }
  }
  componentDidUpdate(prev: DCHostProps) {
    this.logic.props = this.props.userProps ?? {};
    try {
      this.logic.componentDidUpdate(prev.userProps ?? {});
    } catch (e) {
      console.error(e);
    }
  }
  componentWillUnmount() {
    try {
      this.logic.componentWillUnmount();
    } catch (e) {
      console.error(e);
    }
  }
  render() {
    const m = this.props.userProps ?? {};
    this.logic.props = m;
    let vals: Scope = m;
    try {
      vals = { ...m, ...this.logic.renderVals() };
    } catch (e) {
      console.error(e);
    }
    return createElement("div", { className: "sc-host", "data-sc-name": this.props.name }, ...renderNodes(this.props.template, vals, this.props.ctx));
  }
}
