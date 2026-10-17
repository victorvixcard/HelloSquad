"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, type FormEvent } from "react";
import { reportBalanceAction } from "@/app/admin/(painel)/saude/actions";
import { useNotice } from "../squad/VersionFlow";
import { Dialog } from "../TwoFactorBand";

/** Aceita 38,50 · 38.50 · 1.234,56 · US$ 40 (como o SA0); vazio ou sem dígito = null. */
export function parseAmount(text: string): string | null {
  let s = String(text || "").replace(/[^\d,.]/g, "");
  if (!/\d/.test(s)) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (!/^\d+(\.\d{1,2})?$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n.toFixed(2) : null;
}

/** `datetime-local` (hora da pessoa, sem segundos) do instante dado. */
function localInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

type Field = "amount" | "currency" | "read_at" | "reason" | "alert_below";

/**
 * "Informar saldo" da Saúde das APIs (SA0 `saude-apis.js`, o grupo "Saldo lido no painel do provedor"): valor, moeda,
 * quando foi lido, alerta abaixo de (opcional: vazio mantém o atual) e motivo. Grava pela API (auditado) e relê a página;
 * o alerta só avisa.
 */
export function BalanceDialog(props: { provider: string; providerName: string; currency: string | null; alertBelow: string | null }) {
  const t = useTranslations("admin.saude.balance");
  const tc = useTranslations("admin.common");
  const router = useRouter();
  const notice = useNotice();
  const id = useId();
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ amount: "", currency: "USD", readAt: "", alertBelow: "", reason: "" });
  const [invalid, setInvalid] = useState<Field[]>([]);
  const [problem, setProblem] = useState<string | null>(null);

  const start = () => {
    setForm({ amount: "", currency: props.currency ?? "USD", readAt: localInput(new Date()), alertBelow: props.alertBelow ?? "", reason: "" });
    setInvalid([]);
    setProblem(null);
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    opener.current?.focus();
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const amount = parseAmount(form.amount);
    const currency = form.currency.trim().toUpperCase();
    const alertBelow = form.alertBelow.trim() ? parseAmount(form.alertBelow) : null;
    const readAt = form.readAt ? new Date(form.readAt) : null;
    const reason = form.reason.trim();
    const bad: Field[] = [];
    if (amount === null) bad.push("amount");
    if (!/^[A-Z]{3}$/.test(currency)) bad.push("currency");
    if (!readAt || Number.isNaN(readAt.getTime()) || readAt.getTime() > Date.now() + 60_000) bad.push("read_at");
    if (form.alertBelow.trim() && alertBelow === null) bad.push("alert_below");
    if (reason.length < 10 || reason.length > 500) bad.push("reason");
    setInvalid(bad);
    setProblem(null);
    if (bad.length || !readAt || amount === null) return;
    setBusy(true);
    const result = await reportBalanceAction(props.provider, { amount, currency, readAt: readAt.toISOString(), reason, alertBelow });
    setBusy(false);
    if (!result.ok) {
      setProblem(result.message);
      setInvalid(result.fields.filter((f): f is Field => ["amount", "currency", "read_at", "reason", "alert_below"].includes(f)));
      return;
    }
    close();
    notice.show(t("saved", { name: props.providerName }));
    router.refresh();
  };

  const field = (name: Field, label: string, hint: string, input: React.ReactNode) => (
    <div className="sa-fld">
      <label className="sa-fld-l" htmlFor={`${id}-${name}`}>
        {label}
      </label>
      {input}
      <small id={`${id}-${name}-d`} className={invalid.includes(name) ? "sa-fld-err" : undefined}>
        {invalid.includes(name) ? t(`invalid.${name}`) : hint}
      </small>
    </div>
  );
  const common = (name: Field) => ({
    id: `${id}-${name}`,
    "aria-invalid": invalid.includes(name) ? true : undefined,
    "aria-describedby": `${id}-${name}-d`,
  });

  return (
    <>
      <button ref={opener} type="button" className="hs-btn hs-btn--pri hs-btn--s" onClick={start}>
        <span className="hs-lbl">{t("open")}</span>
      </button>
      <Dialog
        open={open}
        onClose={close}
        title={t("title", { name: props.providerName })}
        desc={t("desc")}
        closeLabel={tc("back")}
        footer={
          <>
            <button type="button" className="hs-btn hs-btn--ghost hs-btn--s" onClick={close}>
              <span className="hs-lbl">{t("cancel")}</span>
            </button>
            <button type="button" className="hs-btn hs-btn--pri hs-btn--s" disabled={busy} onClick={() => void submit()}>
              <span className="hs-lbl">{busy ? t("saving") : t("save")}</span>
            </button>
          </>
        }
      >
        <form id={`${id}-form`} className="sa-form c2 hl-form" onSubmit={submit} noValidate>
          {field(
            "amount",
            t("amount"),
            t("amountHint"),
            <input {...common("amount")} data-autofocus className="sa-inp is-num" inputMode="decimal" autoComplete="off" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />,
          )}
          {field(
            "currency",
            t("currency"),
            t("currencyHint"),
            <input {...common("currency")} className="sa-inp" maxLength={3} autoComplete="off" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />,
          )}
          {field(
            "read_at",
            t("readAt"),
            t("readAtHint"),
            <input {...common("read_at")} className="sa-inp" type="datetime-local" value={form.readAt} onChange={(e) => setForm({ ...form, readAt: e.target.value })} />,
          )}
          {field(
            "alert_below",
            t("alertBelow"),
            t("alertBelowHint"),
            <input {...common("alert_below")} className="sa-inp is-num" inputMode="decimal" autoComplete="off" value={form.alertBelow} onChange={(e) => setForm({ ...form, alertBelow: e.target.value })} />,
          )}
          <div className="hl-wide">
            {field(
              "reason",
              t("reason"),
              t("reasonHint"),
              <input {...common("reason")} className="sa-inp" maxLength={500} autoComplete="off" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />,
            )}
          </div>
        </form>
        {problem ? (
          <p className="sa-note is-warn hl-problem" role="alert">
            {problem}
          </p>
        ) : null}
      </Dialog>
      {notice.node}
    </>
  );
}
