import type { AdminIconName } from "./icons";

export type AdminNavId =
  | "contas"
  | "catalogo"
  | "planos"
  | "pagamentos"
  | "auditoria"
  | "squad"
  | "regras"
  | "referencias"
  | "motor"
  | "modelos"
  | "consumo"
  | "saude"
  | "fila"
  | "qualidade";

/** Item da barra: com `href` abre; sem `href` chega na fatia indicada (aparece desabilitado, "em breve"). */
export type AdminNavItem = { id: AdminNavId; icon: AdminIconName; href?: string; slice?: string };

/** Os dois grupos do SA0 (Operação e Squad IA), na ordem e com os ícones do protótipo. */
export const ADMIN_NAV: { id: "op" | "ia"; items: AdminNavItem[] }[] = [
  {
    id: "op",
    items: [
      { id: "contas", icon: "team", href: "/admin/contas" },
      { id: "catalogo", icon: "deliv", href: "/admin/catalogo" },
      { id: "planos", icon: "bag", href: "/admin/planos" },
      { id: "pagamentos", icon: "sheet", href: "/admin/pagamentos" },
      { id: "auditoria", icon: "hist", href: "/admin/auditoria" },
    ],
  },
  {
    id: "ia",
    items: [
      { id: "squad", icon: "squad", href: "/admin/squad" },
      { id: "regras", icon: "file", href: "/admin/regras" },
      { id: "referencias", icon: "folder", slice: "SA5" },
      { id: "motor", icon: "image", slice: "SA5" },
      { id: "modelos", icon: "spark", href: "/admin/modelos" },
      { id: "consumo", icon: "chart", href: "/admin/consumo" },
      { id: "saude", icon: "pulse", slice: "SA4" },
      { id: "fila", icon: "works", href: "/admin/fila" },
      { id: "qualidade", icon: "checkc", href: "/admin/qualidade" },
    ],
  },
];

/** Grupo de cada tela (trilha "Super Admin / Operação / Contas"). */
export function adminGroupOf(id: AdminNavId): "op" | "ia" {
  return ADMIN_NAV.find((g) => g.items.some((it) => it.id === id))?.id ?? "op";
}

/** Item ativo pela rota: `/admin/contas/<id>` continua em Contas; `/admin/fila/<run>` em Fila. */
export function adminNavOf(pathname: string): AdminNavId | null {
  const segment = /^\/admin\/([^/?#]+)/.exec(pathname)?.[1];
  for (const group of ADMIN_NAV) {
    const hit = group.items.find((it) => it.href && it.href === `/admin/${segment}`);
    if (hit) return hit.id;
  }
  return null;
}

/** Contadores da barra (SA0 `badges`): contas com leitura fora da faixa e saldos abaixo do limiar (`GET /admin/alerts`). */
export type AdminBadges = Partial<Record<"consumo" | "saude", number>>;
