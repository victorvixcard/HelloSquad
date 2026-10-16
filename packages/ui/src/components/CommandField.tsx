"use client";

import { useId, useState, type ReactNode } from "react";
import { cx } from "../cx";
import { tokens } from "../tokens";
import { GlyphEyes } from "./GlyphEyes";
import { Icon } from "./Icon";

export type CommandFieldProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Enter ou o botão de envio, com texto. */
  onSend?: (value: string) => void;
  placeholder?: string;
  /** Nome acessível do campo. */
  label?: string;
  /** Nome acessível do botão de envio (o app passa o do catálogo do idioma da tela). */
  sendLabel?: string;
  /** Dica visível ao lado de ↵ (o app passa a do catálogo do idioma da tela). */
  hint?: string;
  /** Pedido enviado: o Nexo (coordenação) assume, com os olhos no botão de envio. */
  sending?: boolean;
  /** Campo indisponível (ainda sem squad respondendo). Use com `note` para dizer por quê. */
  disabled?: boolean;
  /** Nota curta abaixo do campo, ligada a ele por aria-describedby. */
  note?: ReactNode;
  /** Linha de status abaixo do campo (por exemplo um StatePill de presença). */
  status?: ReactNode;
  className?: string;
};

/**
 * Campo de pedido: a forma principal de falar com o squad. Enter envia, Esc limpa.
 * Desenho do DS (hs-field): branco, contorno L2, lábio; cursor em coral (Coordenação).
 */
export function CommandField({
  value,
  defaultValue = "",
  onChange,
  onSend,
  placeholder = "Peça algo ao seu squad",
  label = "Converse com o seu squad",
  sendLabel = "Enviar pedido",
  hint = "enviar",
  sending = false,
  disabled = false,
  note,
  status,
  className,
}: CommandFieldProps) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue);
  const noteId = useId();
  const current = controlled ? value : inner;
  const ready = !disabled && !sending && current.trim().length > 0;

  function update(next: string) {
    if (!controlled) setInner(next);
    onChange?.(next);
  }

  function send() {
    if (ready) onSend?.(current);
  }

  return (
    <div className={cx("hs-cmd", className)}>
      <div
        className={cx(
          "hs-field",
          ready && "is-ready",
          sending && "is-sending",
          disabled && "is-disabled",
        )}
      >
        <input
          className="hs-input"
          type="text"
          value={current}
          placeholder={placeholder}
          aria-label={label}
          aria-describedby={note ? noteId : undefined}
          readOnly={sending}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="send"
          onChange={(event) => {
            if (!sending) update(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            } else if (event.key === "Escape") {
              update("");
            }
          }}
        />
        <span className="hs-hint" aria-hidden="true">
          <span className="hs-kbd">↵</span>
          {hint}
        </span>
        <button
          type="button"
          className={cx("hs-send", sending ? "is-coord" : ready && "is-ready")}
          onClick={send}
          disabled={!ready}
          aria-label={sendLabel}
        >
          <span className="hs-send-ico">
            <Icon name="up" size={20} strokeWidth={2.1} />
          </span>
          <span className="hs-send-eyes">
            <GlyphEyes color={tokens.color["hs-tinta"]} width={26} height={17} />
          </span>
        </button>
      </div>
      {note ? (
        <p className="hs-cmd-note" id={noteId}>
          {note}
        </p>
      ) : null}
      {status ? <div style={{ minHeight: 26, paddingLeft: 4 }}>{status}</div> : null}
    </div>
  );
}
