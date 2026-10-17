"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { planVersionAction, topupVersionAction } from "@/app/admin/(painel)/acoes";
import { ActionDialog } from "./ActionDialog";
import { parseCredits } from "./CatalogActions";

type Current = {
  credits: string;
  cycle?: string;
  validityDays: number | null;
  amount: string | null;
  currency: string | null;
  provisional: boolean;
  approved: boolean;
  forSale: boolean;
};

/** Dinheiro sem sinal, até 2 casas ("49,90", "49.90", "0"); vazio ou inválido = null. */
function parseMoney(text: string): string | null {
  const s = String(text || "").replace(/\s/g, "");
  if (s === "0") return "0.00";
  return parseCredits(s);
}

/**
 * "Editar como versão nova" de um plano ou de uma recarga (SA0 `planos.js`; API da SA6a): créditos, ciclo (plano),
 * validade, preço, provisório e as travas. "À venda" fica travado até o preço ser aprovado comercialmente (e não
 * provisório); a versão anterior nunca muda. Preço só é enviado quando muda (plano: linha nova em `plan_prices`).
 */
export function OfferEditDialog(props: { kind: "plan" | "topup"; slug: string; name: string; version: number; current: Current }) {
  const t = useTranslations("admin.acoes.offer");
  const tc = useTranslations("admin");
  const id = useId();
  const c = props.current;
  const blank = {
    credits: "",
    cycle: "monthly",
    validity: "",
    amount: "",
    currency: "BRL",
    provisional: true,
    approved: false,
    forSale: false,
  };
  const [form, setForm] = useState(blank);
  const set = (patch: Partial<typeof blank>) => setForm((old) => ({ ...old, ...patch }));

  const reset = () =>
    setForm({
      credits: c.credits.replace(".", ","),
      cycle: c.cycle === "one_time" ? "one_time" : "monthly",
      validity: c.validityDays ? String(c.validityDays) : "",
      amount: c.amount ? c.amount.replace(".", ",") : "",
      currency: c.currency ?? "BRL",
      provisional: c.provisional,
      approved: c.approved,
      forSale: c.forSale,
    });

  const credits = parseCredits(form.credits);
  const amount = form.amount.trim() ? parseMoney(form.amount) : null;
  const validity = form.validity.trim() ? Number(form.validity) : null;
  const currency = form.currency.trim().toUpperCase();
  const priceChanged = amount !== null && (c.amount === null || Number(amount) !== Number(c.amount));

  const validate = () => {
    const bad: string[] = [];
    if (credits === null || Number(credits) <= 0) bad.push("credits");
    if (validity !== null && (!Number.isInteger(validity) || validity < 1 || validity > 3650)) bad.push("validity_days");
    if (form.amount.trim() && amount === null) bad.push("amount");
    if (props.kind === "topup" && amount === null) bad.push("amount");
    if (!/^[A-Z]{3}$/.test(currency)) bad.push("currency");
    if (form.approved && form.provisional) bad.push("approved_commercially");
    return bad;
  };

  const submit = (reason: string) => {
    const common = {
      credits: credits ?? "0",
      validity_days: validity,
      currency,
      provisional: form.provisional,
      approved_commercially: form.approved,
      for_sale: form.forSale,
      reason,
    };
    return props.kind === "plan"
      ? planVersionAction(props.slug, { ...common, cycle: form.cycle as "one_time" | "monthly", ...(priceChanged ? { amount } : {}) })
      : topupVersionAction(props.slug, { ...common, amount: amount ?? "0" });
  };

  const input = (name: string, label: string, value: string, onChange: (v: string) => void, hint: string, invalid: string[], extra?: object) => (
    <div className="sa-fld">
      <label className="sa-fld-l" htmlFor={`${id}-${name}`}>
        {label}
      </label>
      <input
        id={`${id}-${name}`}
        className="sa-inp is-num"
        autoComplete="off"
        value={value}
        aria-invalid={invalid.includes(name) || undefined}
        aria-describedby={`${id}-${name}-d`}
        onChange={(e) => onChange(e.target.value)}
        {...extra}
      />
      <small id={`${id}-${name}-d`} className={invalid.includes(name) ? "sa-fld-err" : undefined}>
        {invalid.includes(name) ? t(`invalid.${name}` as never) : hint}
      </small>
    </div>
  );

  return (
    <ActionDialog<unknown>
      label={t("open")}
      variant="soft"
      title={t("title", { name: props.name, next: props.version + 1 })}
      desc={t("desc", { version: props.version })}
      confirmLabel={t("confirm", { next: props.version + 1 })}
      onOpen={reset}
      validate={validate}
      wide
      fields={(invalid) => (
        <div className="sa-form c2">
          {input("credits", props.kind === "plan" ? t("credits") : t("topupCredits"), form.credits, (v) => set({ credits: v }), t("creditsHint"), invalid, {
            inputMode: "decimal",
            "data-autofocus": true,
          })}
          {props.kind === "plan" ? (
            <div className="sa-fld">
              <label className="sa-fld-l" htmlFor={`${id}-cycle`}>
                {t("cycle")}
              </label>
              <select id={`${id}-cycle`} className="sa-inp" value={form.cycle} onChange={(e) => set({ cycle: e.target.value })}>
                <option value="monthly">{tc("codes.cycle.monthly" as never)}</option>
                <option value="one_time">{tc("codes.cycle.one_time" as never)}</option>
              </select>
              <small>{t("cycleHint")}</small>
            </div>
          ) : (
            <div />
          )}
          {input("validity_days", t("validity"), form.validity, (v) => set({ validity: v }), t("validityHint"), invalid, { inputMode: "numeric" })}
          <div />
          {input(
            "amount",
            t("amount"),
            form.amount,
            (v) => set({ amount: v }),
            props.kind === "plan" ? t("amountHintPlan") : t("amountHintTopup"),
            invalid,
            { inputMode: "decimal" },
          )}
          {input("currency", t("currency"), form.currency, (v) => set({ currency: v }), t("currencyHint"), invalid, { maxLength: 3, className: "sa-inp" })}
          <div className="sa-fld hl-wide">
            <label className="hl-check">
              <input type="checkbox" checked={form.provisional} onChange={(e) => set({ provisional: e.target.checked, ...(e.target.checked ? { approved: false, forSale: false } : {}) })} />
              {t("provisional")}
            </label>
            <label className="hl-check">
              <input
                type="checkbox"
                checked={form.approved}
                aria-invalid={invalid.includes("approved_commercially") || undefined}
                onChange={(e) => set({ approved: e.target.checked, ...(e.target.checked ? {} : { forSale: false }) })}
              />
              {t("approved")}
            </label>
            <label className="hl-check">
              <input
                type="checkbox"
                checked={form.forSale}
                disabled={!form.approved || form.provisional}
                aria-describedby={`${id}-sale-d`}
                onChange={(e) => set({ forSale: e.target.checked })}
              />
              {t("forSale")}
            </label>
            <small id={`${id}-sale-d`} className={invalid.includes("approved_commercially") ? "sa-fld-err" : undefined}>
              {invalid.includes("approved_commercially") ? t("invalid.approved_commercially") : t("lockHint")}
            </small>
          </div>
        </div>
      )}
      submit={submit}
      done={() => t("done", { name: props.name, next: props.version + 1 })}
    />
  );
}
