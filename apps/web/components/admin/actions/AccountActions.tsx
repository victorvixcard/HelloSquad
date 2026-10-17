"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { accountStatusAction, adjustCreditsAction, endSupportSessionAction, startSupportSessionAction } from "@/app/admin/(painel)/acoes";
import { TIME_ZONE } from "@/i18n/config";
import { adminFormat } from "@/lib/admin-format";
import { ActionDialog } from "./ActionDialog";

const DURATIONS = [15, 30, 60] as const;
type Duration = (typeof DURATIONS)[number];

/** Hora de Brasília (HH:MM) de um instante. */
function hourOf(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TIME_ZONE }).format(new Date(iso));
}

/**
 * Créditos com sinal e até 2 casas: "10", "-5,50", "+1.234,56", "2.5". Vazio, zero, mais de 2 casas ou texto = null
 * (a API recusa os mesmos casos; aqui o campo é marcado antes de chamar).
 */
export function parseSignedCredits(text: string): string | null {
  let s = String(text || "").replace(/\s/g, "").replace(/^\+/, "").replace(/^−/, "-");
  const negative = s.startsWith("-");
  if (negative) s = s.slice(1);
  if (!/^[\d.,]+$/.test(s)) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n === 0) return null;
  return `${negative ? "-" : ""}${n.toFixed(2)}`;
}

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

/** "Entrar no ambiente" (SA0 `conta.js`): motivo e duração 15/30/60 (padrão 30). Só leitura; o titular é avisado. */
export function EnterSupportDialog(props: { workspaceId: string; name: string; disabled?: boolean; disabledReason?: string }) {
  const t = useTranslations("admin.acoes.enter");
  const locale = useLocale();
  const id = useId();
  const [duration, setDuration] = useState<Duration>(30);
  return (
    <ActionDialog
      label={t("open")}
      variant="primary"
      disabled={props.disabled}
      disabledReason={props.disabledReason}
      title={t("title", { name: props.name })}
      desc={t("desc")}
      confirmLabel={t("confirm")}
      reasonLabel={t("reason")}
      reasonHint={t("reasonHint")}
      onOpen={() => setDuration(30)}
      fields={() => (
        <div className="sa-fld">
          <span className="sa-fld-l" id={`${id}-dur`}>
            {t("duration")}
          </span>
          <div className="sa-segl" role="radiogroup" aria-labelledby={`${id}-dur`}>
            {DURATIONS.map((d) => (
              <label key={d} className={`sq-seg${duration === d ? " is-on" : ""}`}>
                <input type="radio" name={`${id}-d`} value={d} checked={duration === d} onChange={() => setDuration(d)} />
                {t("minutes", { n: d })}
              </label>
            ))}
          </div>
          <small>{t("durationHint")}</small>
        </div>
      )}
      submit={(reason) => startSupportSessionAction(props.workspaceId, { reason, durationMinutes: duration })}
      done={(s) => t("done", { name: props.name, until: hourOf(s.expires_at, locale) })}
    />
  );
}

/**
 * Sessão de suporte aberta por quem está no painel: faixa com o prazo, o tempo que falta (atualiza a cada 15 s) e
 * "Encerrar". Ao vencer, a página é relida (a API já não deixa ler).
 */
export function SupportSessionBand(props: { workspaceId: string; name: string; expiresAt: string; reason: string }) {
  const t = useTranslations("admin.acoes.session");
  const locale = useLocale();
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const end = new Date(props.expiresAt).getTime();
  const left = Math.max(0, Math.ceil((end - now) / 60_000));
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(tick);
  }, []);
  useEffect(() => {
    if (end <= now) router.refresh();
  }, [end, now, router]);
  return (
    <div className="sa-note is-warn hl-session" role="region" aria-label={t("label")}>
      <span className="sa-lbl">{t("label")}</span>
      <div className="hl-session-row">
        <span>
          <b>{t("until", { time: hourOf(props.expiresAt, locale) })}</b> <span className="sa-num">{left > 0 ? t("left", { n: left }) : t("expired")}</span>{" "}
          {t("reason", { reason: props.reason })} {t("readOnly")}
        </span>
        <ActionDialog
          label={t("end")}
          variant="soft"
          title={t("endTitle", { name: props.name })}
          desc={t("endDesc")}
          confirmLabel={t("endConfirm")}
          noReason
          submit={() => endSupportSessionAction(props.workspaceId)}
          done={() => t("ended", { name: props.name })}
        />
      </div>
    </div>
  );
}

/** "Ajustar crédito" (SA0 `conta.js`): valor com sinal e 2 casas, motivo, saldo antes → depois; chave gerada ao abrir. */
export function CreditAdjustDialog(props: { workspaceId: string; name: string; balance: string; available: string }) {
  const t = useTranslations("admin.acoes.credit");
  const locale = useLocale();
  const f = adminFormat(locale);
  const id = useId();
  const [amount, setAmount] = useState("");
  const [key, setKey] = useState("");
  const parsed = parseSignedCredits(amount);
  const after = parsed === null ? null : (Number(props.balance) + Number(parsed)).toFixed(2);
  return (
    <ActionDialog
      label={t("open")}
      title={t("title", { name: props.name })}
      desc={t("desc")}
      confirmLabel={t("confirm")}
      onOpen={() => {
        setAmount("");
        setKey(newKey());
      }}
      summary={t("summary", { before: f.credits(props.balance), after: after === null ? "—" : f.credits(after) })}
      validate={() => (parsed === null ? ["amount"] : [])}
      fields={(invalid) => (
        <div className="sa-fld">
          <label className="sa-fld-l" htmlFor={`${id}-amount`}>
            {t("amount")}
          </label>
          <input
            id={`${id}-amount`}
            className="sa-inp is-num"
            inputMode="decimal"
            autoComplete="off"
            data-autofocus
            value={amount}
            aria-invalid={invalid.includes("amount") || undefined}
            aria-describedby={`${id}-amount-d`}
            onChange={(e) => setAmount(e.target.value)}
          />
          <small id={`${id}-amount-d`} className={invalid.includes("amount") ? "sa-fld-err" : undefined}>
            {invalid.includes("amount") ? t("amountInvalid") : t("amountHint", { available: f.credits(props.available) })}
          </small>
        </div>
      )}
      submit={(reason) => adjustCreditsAction(props.workspaceId, { amount: parsed ?? "0", reason, idempotencyKey: key })}
      done={(r) =>
        r.duplicate
          ? t("duplicate", { balance: f.credits(r.balance_after) })
          : t("done", { amount: f.signed(r.amount), before: f.credits(r.balance_before), after: f.credits(r.balance_after) })
      }
    />
  );
}

/** "Suspender" / "Reativar" com motivo. O texto diz o que a API faz de fato (SA6a): pausa renovação e rotinas. */
export function AccountStatusDialog(props: { workspaceId: string; name: string; status: "active" | "suspended" | "deleted" }) {
  const t = useTranslations("admin.acoes.status");
  const suspended = props.status === "suspended";
  const to = suspended ? "reactivate" : "suspend";
  return (
    <ActionDialog
      label={t(`${to}.open`)}
      disabled={props.status === "deleted"}
      title={t(`${to}.title`, { name: props.name })}
      desc={t(`${to}.desc`)}
      confirmLabel={t(`${to}.confirm`)}
      reasonHint={t("reasonHint")}
      submit={(reason) => accountStatusAction(props.workspaceId, to, reason)}
      done={() => t(`${to}.done`, { name: props.name })}
    />
  );
}
