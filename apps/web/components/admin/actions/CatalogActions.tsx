"use client";

import type { components } from "@hellosquad/contracts";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { catalogForSaleAction, catalogHomologationAction, catalogPriceAction } from "@/app/admin/(painel)/acoes";
import { adminFormat } from "@/lib/admin-format";
import { ActionDialog } from "./ActionDialog";

type Homologation = components["schemas"]["HomologationUpdate"]["status"];
export const HOMOLOGATIONS: readonly Homologation[] = ["not_started", "in_homologation", "awaiting_integration", "awaiting_engine", "homologated"];
type Mode = "price" | "homologation" | "sale";

/** Créditos sem sinal, até 2 casas ("10", "12,5", "0,75"); vazio ou inválido = null. */
export function parseCredits(text: string): string | null {
  let s = String(text || "").replace(/\s/g, "");
  if (!/^[\d.,]+$/.test(s)) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Number(s).toFixed(2);
}

/**
 * "Editar preço e venda" de uma delivery (SA0 `catalogo.js`, as travas do catálogo; API da SA6a): três ações, cada
 * uma com o seu motivo — preço novo (versão nova; provisório marcado por padrão; aprovado e provisório ao mesmo
 * tempo não vale), homologação (estado) e "à venda" (a API recusa com 409 e diz o que falta).
 */
export function CatalogEditDialog(props: {
  deliveryType: string;
  name: string;
  price: { credits: string; revision_credits: string | null; provisional: boolean; approved_commercially: boolean } | null;
  homologation: string;
  forSale: boolean;
}) {
  const t = useTranslations("admin.acoes.catalog");
  const tc = useTranslations("admin");
  const f = adminFormat(useLocale());
  const id = useId();
  const [mode, setMode] = useState<Mode>("price");
  const [credits, setCredits] = useState("");
  const [revision, setRevision] = useState("");
  const [provisional, setProvisional] = useState(true);
  const [approved, setApproved] = useState(false);
  const [homologation, setHomologation] = useState<Homologation>("not_started");
  const [forSale, setForSale] = useState(false);

  const reset = () => {
    setMode("price");
    setCredits(props.price ? props.price.credits.replace(".", ",") : "");
    setRevision(props.price?.revision_credits ? props.price.revision_credits.replace(".", ",") : "");
    setProvisional(props.price ? props.price.provisional : true);
    setApproved(props.price ? props.price.approved_commercially : false);
    setHomologation((HOMOLOGATIONS as readonly string[]).includes(props.homologation) ? (props.homologation as Homologation) : "not_started");
    setForSale(!props.forSale);
  };

  const validate = (): string[] => {
    if (mode !== "price") return [];
    const bad: string[] = [];
    const c = parseCredits(credits);
    if (c === null || Number(c) <= 0) bad.push("credits");
    if (revision.trim() && parseCredits(revision) === null) bad.push("revision_credits");
    if (approved && provisional) bad.push("approved_commercially");
    return bad;
  };

  const submit = (reason: string) => {
    if (mode === "price") {
      return catalogPriceAction(props.deliveryType, {
        credits: parseCredits(credits) ?? "0",
        revisionCredits: revision.trim() ? parseCredits(revision) : null,
        provisional,
        approved,
        reason,
      });
    }
    if (mode === "homologation") return catalogHomologationAction(props.deliveryType, { status: homologation, reason });
    return catalogForSaleAction(props.deliveryType, { forSale, reason });
  };

  const check = (name: string, label: string, value: boolean, set: (v: boolean) => void, invalid: string[]) => (
    <label className="hl-check">
      <input type="checkbox" checked={value} aria-invalid={invalid.includes(name) || undefined} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  );

  return (
    <ActionDialog<unknown>
      label={t("open")}
      variant="soft"
      title={t("title", { id: props.deliveryType, name: props.name })}
      desc={t("desc")}
      confirmLabel={t(`confirm.${mode}`)}
      onOpen={reset}
      validate={validate}
      fields={(invalid) => (
        <>
          <div className="sa-fld">
            <span className="sa-fld-l" id={`${id}-mode`}>
              {t("mode")}
            </span>
            <div className="sa-segl" role="radiogroup" aria-labelledby={`${id}-mode`}>
              {(["price", "homologation", "sale"] as const).map((m) => (
                <label key={m} className={`sq-seg${mode === m ? " is-on" : ""}`}>
                  <input type="radio" name={`${id}-m`} value={m} checked={mode === m} onChange={() => setMode(m)} />
                  {t(`modes.${m}`)}
                </label>
              ))}
            </div>
          </div>
          {mode === "price" ? (
            <div className="sa-form c2">
              <div className="sa-fld">
                <label className="sa-fld-l" htmlFor={`${id}-credits`}>
                  {t("credits")}
                </label>
                <input
                  id={`${id}-credits`}
                  className="sa-inp is-num"
                  inputMode="decimal"
                  autoComplete="off"
                  value={credits}
                  aria-invalid={invalid.includes("credits") || undefined}
                  aria-describedby={`${id}-credits-d`}
                  onChange={(e) => setCredits(e.target.value)}
                />
                <small id={`${id}-credits-d`} className={invalid.includes("credits") ? "sa-fld-err" : undefined}>
                  {invalid.includes("credits")
                    ? t("creditsInvalid")
                    : props.price
                      ? t("creditsNow", { credits: f.credits(props.price.credits) })
                      : t("creditsNone")}
                </small>
              </div>
              <div className="sa-fld">
                <label className="sa-fld-l" htmlFor={`${id}-rev`}>
                  {t("revision")}
                </label>
                <input
                  id={`${id}-rev`}
                  className="sa-inp is-num"
                  inputMode="decimal"
                  autoComplete="off"
                  value={revision}
                  aria-invalid={invalid.includes("revision_credits") || undefined}
                  aria-describedby={`${id}-rev-d`}
                  onChange={(e) => setRevision(e.target.value)}
                />
                <small id={`${id}-rev-d`} className={invalid.includes("revision_credits") ? "sa-fld-err" : undefined}>
                  {invalid.includes("revision_credits") ? t("creditsInvalid") : t("revisionHint")}
                </small>
              </div>
              <div className="sa-fld hl-wide">
                {check("provisional", t("provisional"), provisional, setProvisional, invalid)}
                {check("approved_commercially", t("approved"), approved, setApproved, invalid)}
                <small className={invalid.includes("approved_commercially") ? "sa-fld-err" : undefined}>
                  {invalid.includes("approved_commercially") ? t("approvedInvalid") : t("approvedHint")}
                </small>
              </div>
            </div>
          ) : null}
          {mode === "homologation" ? (
            <div className="sa-fld">
              <label className="sa-fld-l" htmlFor={`${id}-homol`}>
                {t("homologation")}
              </label>
              <select
                id={`${id}-homol`}
                className="sa-inp"
                value={homologation}
                aria-describedby={`${id}-homol-d`}
                onChange={(e) => setHomologation(e.target.value as Homologation)}
              >
                {HOMOLOGATIONS.map((h) => (
                  <option key={h} value={h}>
                    {tc(`codes.homologation.${h}` as never)}
                  </option>
                ))}
              </select>
              <small id={`${id}-homol-d`}>{t("homologationHint")}</small>
            </div>
          ) : null}
          {mode === "sale" ? (
            <div className="sa-fld">
              {check("for_sale", t("forSale"), forSale, setForSale, invalid)}
              <small>{t("forSaleHint")}</small>
            </div>
          ) : null}
        </>
      )}
      submit={submit}
      done={() =>
        mode === "price"
          ? t("done.price", { id: props.deliveryType })
          : mode === "homologation"
            ? t("done.homologation", { id: props.deliveryType, status: tc(`codes.homologation.${homologation}` as never) })
            : t(forSale ? "done.saleOn" : "done.saleOff", { id: props.deliveryType })
      }
    />
  );
}
