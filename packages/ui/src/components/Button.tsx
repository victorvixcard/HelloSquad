import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ElementType,
  MouseEvent,
  ReactNode,
} from "react";
import { cx } from "../cx";
import { tokens } from "../tokens";
import { GlyphEyes } from "./GlyphEyes";
import { Icon, type IconName } from "./Icon";

/**
 * Variantes do DS. Todas são pílula (r-pilula):
 * - primary: Tinta com lábio (E1 · tecla), seta que avança no hover. A ação principal da tela.
 * - secondary: transparente, com o círculo de play.
 * - soft: pílula branca com contorno (L2) e lábio leve.
 * - ghost: só texto, em Tinta suave.
 */
export type ButtonVariant = "primary" | "secondary" | "soft" | "ghost";
export type ButtonState = "rest" | "loading" | "done";

type OwnProps = {
  variant?: ButtonVariant;
  /** "s" = 40 px de altura; o padrão tem 52 px. */
  size?: "md" | "s";
  /** Só no primário: troca o rótulo por olhos trabalhando (loading) ou felizes (done). */
  state?: ButtonState;
  /** Ícone do primário (padrão: seta) ou do secundário (padrão: play). null remove. */
  icon?: IconName | null;
  loadingLabel?: string;
  doneLabel?: string;
  /** Ocupa a largura toda do contêiner. */
  block?: boolean;
  className?: string;
  children: ReactNode;
};

type AsButton = OwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof OwnProps> & { href?: undefined };
type AsLink = OwnProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof OwnProps> & {
    href: string;
    /** Componente de link (por exemplo o Link do Next). Padrão: <a>. */
    linkAs?: ElementType;
  };
export type ButtonProps = AsButton | AsLink;

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "hs-btn--pri",
  secondary: "hs-btn--sec",
  soft: "hs-btn--soft",
  ghost: "hs-btn--ghost",
};

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    state = "rest",
    icon,
    loadingLabel = "Carregando",
    doneLabel = "Pronto",
    block = false,
    className,
    children,
    ...rest
  } = props;
  const small = size === "s";
  const busy = variant === "primary" && state !== "rest";
  const classes = cx(
    "hs-btn",
    VARIANT_CLASS[variant],
    small && "hs-btn--s",
    block && "hs-btn--block",
    busy && state === "loading" && "is-loading",
    busy && state === "done" && "is-done",
    className,
  );

  let label: ReactNode;
  if (variant === "primary") {
    label = (
      <span className="hs-face">
        <span className="hs-lbl hs-lbl--rest" aria-hidden={busy || undefined}>
          {children}
          {icon === null ? null : (
            <Icon name={icon ?? "arrow"} size={small ? 15 : 16} strokeWidth={2} className="hs-arrow" />
          )}
        </span>
        <span className="hs-lbl hs-lbl--load" aria-hidden={state !== "loading"}>
          <GlyphEyes color={tokens.color["hs-papel"]} />
          {loadingLabel}
        </span>
        <span className="hs-lbl hs-lbl--done" aria-hidden={state !== "done"}>
          <GlyphEyes color={tokens.color["hs-papel"]} expression="happy" />
          {doneLabel}
        </span>
      </span>
    );
  } else if (variant === "secondary") {
    label = (
      <span className="hs-lbl">
        {icon === null ? null : (
          <span className="hs-play">
            <Icon name={icon ?? "play"} size={11} />
          </span>
        )}
        {children}
      </span>
    );
  } else {
    label = <span className="hs-lbl">{children}</span>;
  }

  if (rest.href !== undefined) {
    const { linkAs, ...anchorProps } = rest as Omit<AsLink, keyof OwnProps>;
    const Link = linkAs ?? "a";
    return (
      <Link {...anchorProps} className={classes}>
        {label}
      </Link>
    );
  }

  const { type = "button", onClick, disabled, ...buttonProps } = rest as Omit<AsButton, keyof OwnProps>;
  return (
    <button
      {...buttonProps}
      type={type}
      className={cx(classes, disabled && variant === "primary" && "is-disabled")}
      disabled={disabled}
      aria-busy={state === "loading" || undefined}
      // Só há handler quando precisa: assim o Button também renderiza em Server Components.
      onClick={
        busy || onClick
          ? (event: MouseEvent<HTMLButtonElement>) => {
              // Enquanto carrega ou mostra "pronto", não dispara de novo (nem envia o formulário).
              if (busy) {
                event.preventDefault();
                return;
              }
              onClick?.(event);
            }
          : undefined
      }
    >
      {label}
    </button>
  );
}
