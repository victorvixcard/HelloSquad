"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import type { ActionResult } from "@/app/admin/(painel)/acoes";
import { Dialog } from "../TwoFactorBand";

export const REASON_MIN = 10;
export const REASON_MAX = 500;

/** Motivo aceito pela API (`app.admin_reason`): 10 a 500 caracteres depois de tirar os espaços das pontas. */
export function reasonOk(text: string): boolean {
  const n = text.trim().length;
  return n >= REASON_MIN && n <= REASON_MAX;
}

/* Aviso do resultado: mora na casca (`ActionNoticeHost`), para não sumir quando a linha da tabela muda de estado e o
   botão que abriu o diálogo sai da tela depois do `router.refresh()`. */
let current: string | null = null;
const listeners = new Set<() => void>();
function emit(next: string | null) {
  current = next;
  for (const l of listeners) l();
}
export function showActionNotice(message: string) {
  emit(message);
}

export function ActionNoticeHost() {
  const notice = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => emit(null), 6000);
    return () => clearTimeout(id);
  }, [notice]);
  return (
    <div role="status" aria-live="polite" className="sq-live">
      {notice ? <div className="sa-toast">{notice}</div> : null}
    </div>
  );
}

export type ActionDialogProps<T> = {
  /** Texto do botão que abre o diálogo. */
  label: string;
  variant?: "primary" | "ghost" | "soft";
  disabled?: boolean;
  /** Por que o botão está desabilitado (vai no nome acessível e no `title`). */
  disabledReason?: string;
  title: string;
  desc?: string;
  confirmLabel: string;
  /** Campos próprios da ação, acima do motivo; recebem os campos que a validação ou a API recusaram. */
  fields?: (invalid: string[]) => ReactNode;
  /** Linha à esquerda do rodapé (ex.: "Saldo: 36,00 → 41,00"). */
  summary?: ReactNode;
  /** Sem motivo (encerrar a sessão de suporte): a API não pede. */
  noReason?: boolean;
  reasonLabel?: string;
  reasonHint?: string;
  /** Campos inválidos antes de chamar a API; vazio = pode enviar. */
  validate?: () => string[];
  /** Zera o estado dos campos do pai a cada abertura. */
  onOpen?: () => void;
  submit: (reason: string) => Promise<ActionResult<T>>;
  /** Mensagem de sucesso, com o que a API devolveu. */
  done: (data: T) => string;
  wide?: boolean;
};

/**
 * Ação de escrita do painel (SA0 `conta.js`, `fila.js`, `pagamentos.js`): botão → diálogo com confirmação e motivo
 * (10 a 500, com contador) → API → aviso com o resultado e a página relida (`router.refresh()`: a entrada nova da
 * Auditoria aparece sem recarregar). Erro da API fica no diálogo: 409 com a mensagem do servidor, 422 marcando o campo.
 */
export function ActionDialog<T>(props: ActionDialogProps<T>) {
  const t = useTranslations("admin.acoes");
  const tc = useTranslations("admin.common");
  const router = useRouter();
  const id = useId();
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [invalid, setInvalid] = useState<string[]>([]);
  const [problem, setProblem] = useState<string | null>(null);

  const start = () => {
    props.onOpen?.();
    setReason("");
    setInvalid([]);
    setProblem(null);
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    opener.current?.focus();
  };

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    const bad = [...(props.validate?.() ?? [])];
    if (!props.noReason && !reasonOk(reason)) bad.push("reason");
    setInvalid(bad);
    setProblem(null);
    if (bad.length) return;
    setBusy(true);
    try {
      const result = await props.submit(reason.trim());
      if (!result.ok) {
        setProblem(result.status === 422 && !result.message ? t("invalid") : result.message);
        setInvalid(result.fields);
        return;
      }
      close();
      showActionNotice(props.done(result.data));
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const count = reason.trim().length;
  const variant = props.variant ?? "ghost";
  return (
    <>
      <button
        ref={opener}
        type="button"
        className={`hs-btn hs-btn--${variant} hs-btn--s`}
        disabled={props.disabled}
        title={props.disabled ? props.disabledReason : undefined}
        aria-label={props.disabled && props.disabledReason ? `${props.label} (${props.disabledReason})` : undefined}
        onClick={start}
      >
        <span className="hs-lbl">{props.label}</span>
      </button>
      <Dialog
        open={open}
        onClose={close}
        title={props.title}
        desc={props.desc}
        wide={props.wide}
        closeLabel={tc("back")}
        footer={
          <>
            {props.summary ? <span className="sa-grow sa-num">{props.summary}</span> : <span className="sa-grow" />}
            <button type="button" className="hs-btn hs-btn--ghost hs-btn--s" onClick={close}>
              <span className="hs-lbl">{t("cancel")}</span>
            </button>
            <button type="submit" form={`${id}-form`} className="hs-btn hs-btn--primary hs-btn--s" disabled={busy} aria-busy={busy || undefined}>
              <span className="hs-lbl">{busy ? t("sending") : props.confirmLabel}</span>
            </button>
          </>
        }
      >
        <form id={`${id}-form`} className="sa-form hl-form" onSubmit={send} noValidate>
          {props.fields?.(invalid)}
          {props.noReason ? null : (
            <div className="sa-fld">
              <label className="sa-fld-l" htmlFor={`${id}-reason`}>
                {props.reasonLabel ?? t("reason")}
              </label>
              <textarea
                id={`${id}-reason`}
                className="sa-inp"
                rows={3}
                maxLength={REASON_MAX}
                value={reason}
                data-autofocus={props.fields ? undefined : true}
                aria-invalid={invalid.includes("reason") || undefined}
                aria-describedby={`${id}-reason-d`}
                onChange={(e) => setReason(e.target.value)}
                style={{ minHeight: 92 }}
              />
              <small id={`${id}-reason-d`} className={invalid.includes("reason") ? "sa-fld-err" : undefined}>
                {invalid.includes("reason") ? t("reasonInvalid", { min: REASON_MIN, max: REASON_MAX }) : props.reasonHint ?? t("reasonHint")}{" "}
                <span className="sa-mut">{t("reasonCount", { n: count, max: REASON_MAX })}</span>
              </small>
            </div>
          )}
        </form>
        {problem ? (
          <p className="sa-note is-warn hl-problem" role="alert">
            {problem}
          </p>
        ) : null}
      </Dialog>
    </>
  );
}
