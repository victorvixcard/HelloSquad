import { TIME_ZONE } from "@/i18n/config";

/** Data só com dia (`2026-10-16`): meio-dia em UTC, para o fuso de Brasília não voltar um dia. */
function toDate(iso: string): Date {
  return new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
}

/**
 * Formatos do painel no idioma da tela, no fuso de referência do produto (America/Sao_Paulo). Valores da API chegam
 * como texto decimal (créditos, dinheiro, custo); vazio vira "—" no componente, nunca zero inventado.
 */
export function adminFormat(locale: string) {
  const int = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const credits = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const day = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TIME_ZONE });
  const dayTime = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TIME_ZONE,
  });
  return {
    int: (value: number | string) => int.format(Number(value)),
    credits: (value: number | string) => credits.format(Number(value)),
    /** Créditos com sinal (extrato): "+100" e "−10". */
    signed: (value: number | string) => {
      const n = Number(value);
      return `${n > 0 ? "+" : n < 0 ? "−" : ""}${credits.format(Math.abs(n))}`;
    },
    money: (amount: number | string, currency: string) =>
      new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount)),
    usd: (value: number | string, digits = 2) =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(Number(value)),
    date: (iso: string) => day.format(toDate(iso)),
    dateTime: (iso: string) => dayTime.format(toDate(iso)),
    tokens: (value: number) =>
      new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value),
  };
}

export type AdminFormat = ReturnType<typeof adminFormat>;
