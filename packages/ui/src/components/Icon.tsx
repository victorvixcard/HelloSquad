import type { CSSProperties } from "react";
import { cx } from "../cx";
import { ICONS } from "../generated/icons";
import { NAV_ICONS, PANEL_ICON } from "../generated/product-ui";

/**
 * Os 11 ícones de traço do DS: seta (arrow), enviar (up), mais (plus), check, abrir (chev),
 * voltar (left), avançar (right), fechar (close), enter, opções (more) e play.
 */
export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export type IconProps = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  /** Nome acessível. Sem ele, o ícone é decorativo (aria-hidden). */
  title?: string;
  className?: string;
};

export function Icon({ name, size = 18, strokeWidth = 1.9, title, className }: IconProps) {
  const icon = ICONS[name];
  const style: CSSProperties = icon.fill
    ? { display: "block", marginLeft: name === "play" ? 2 : 0 }
    : {
        display: "block",
        fill: "none",
        stroke: "currentColor",
        strokeWidth,
        strokeLinecap: "round",
        strokeLinejoin: "round",
      };
  return (
    <svg
      className={cx("hs-ico", `hs-ico--${name}`, className)}
      width={size}
      height={size}
      viewBox={icon.vb}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      style={style}
      // Conteúdo estático do bundle oficial do DS.
      dangerouslySetInnerHTML={{ __html: icon.inner }}
    />
  );
}

/** Ícones dos destinos da barra lateral V4.6 (ProductUIV4.dc.html), mais o de recolher (panel). */
export type NavIconName = keyof typeof NAV_ICONS | "panel";

export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const parts: readonly string[] = name === "panel" ? [PANEL_ICON] : NAV_ICONS[name];
  return (
    <svg className={cx("hs-nav-ic", className)} viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      {parts.map((d, i) => (
        <path key={i} className={`p${i + 1}`} d={d} />
      ))}
    </svg>
  );
}
