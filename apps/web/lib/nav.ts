import { SQUAD, type AgentId, type NavIconName } from "@hellosquad/ui";

export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: NavIconName;
  /** Especialista responsável pelo ambiente (grupo "Seu squad"). */
  agent?: AgentId;
};

export type NavGroup = { key: "main" | "squad" | "mgmt"; label: string; items: NavItem[] };

// Ícone de cada ambiente, como na V4.6 (IC.nav do ProductUIV4.dc.html).
const SQUAD_ICON: Record<AgentId, NavIconName> = {
  nexo: "works",
  bia: "strat",
  kaia: "brand",
  otto: "cont",
  kiwi: "media",
  max: "crm",
  iris: "res",
};

/** Os três grupos da barra lateral V4.6: Principal, Seu squad e Gestão. */
export function navGroups(slug: string): NavGroup[] {
  const base = `/app/${slug}`;
  return [
    {
      key: "main",
      label: "Principal",
      items: [
        { key: "home", label: "Início", href: base, icon: "home" },
        { key: "room", label: "Sala do Squad", href: `${base}/sala-do-squad`, icon: "chat" },
      ],
    },
    {
      key: "squad",
      label: "Seu squad",
      items: SQUAD.map((member) => ({
        key: member.id,
        label: member.area,
        href: `${base}/squad/${member.id}`,
        icon: SQUAD_ICON[member.id],
        agent: member.id,
      })),
    },
    {
      key: "mgmt",
      label: "Gestão",
      items: [
        { key: "auto", label: "Modo Autônomo", href: `${base}/modo-autonomo`, icon: "auto" },
        { key: "mem", label: "Memória da Marca", href: `${base}/memoria-da-marca`, icon: "mem" },
        { key: "team", label: "Minha Equipe & Conversas", href: `${base}/equipe`, icon: "team" },
      ],
    },
  ];
}

export function isActive(item: NavItem, pathname: string, slug: string): boolean {
  if (item.key === "home") return pathname === `/app/${slug}`;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
