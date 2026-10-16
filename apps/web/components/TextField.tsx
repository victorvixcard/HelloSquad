"use client";

import { useTranslations } from "next-intl";
import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  /** Dica permanente abaixo do campo. */
  hint?: ReactNode;
  /** Erro do campo, ligado por aria-describedby e anunciado. */
  error?: string;
  /** Campo de senha com o botão Mostrar/Ocultar. */
  reveal?: boolean;
};

/** Campo de texto da HelloSquad (desenho do campo dos modais da landing V1). */
export function TextField({ label, hint, error, reveal = false, type = "text", className, ...input }: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-dica`;
  const errorId = `${id}-erro`;
  const [visible, setVisible] = useState(false);
  const t = useTranslations("auth.textField");
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`hs-tf${className ? ` ${className}` : ""}`}>
      <label className="hs-tf-l" htmlFor={id}>
        {label}
      </label>
      <div className="hs-tf-box">
        <input
          {...input}
          id={id}
          type={reveal && visible ? "text" : type}
          className="hs-tf-in"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        {reveal ? (
          <button
            type="button"
            className="hs-tf-reveal"
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? t("hide") : t("show")}
          </button>
        ) : null}
      </div>
      {hint ? (
        <p className="hs-tf-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="hs-tf-err" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
