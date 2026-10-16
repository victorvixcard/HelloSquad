/** Chave do catálogo para um tipo de entrega ("04.01" → "d0401"): o next-intl não aceita "." em chave. */
export function deliveryTypeKey(type: string | null | undefined): "d0401" | null {
  return type === "04.01" ? "d0401" : null;
}
