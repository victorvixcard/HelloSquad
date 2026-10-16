import type { AgentId } from "@hellosquad/ui";

/**
 * Entregas que o squad executa (S1c, S2a, S2b): código do catálogo (Documento Mestre, Anexo A) → quem responde.
 * A Kaia não entra: as entregas visuais esperam o motor de imagem do dono (decisão de 16/10).
 */
export const DELIVERY_OWNER = {
  "02.01": "bia",
  "02.02": "bia",
  "02.03": "bia",
  "02.04": "bia",
  "02.07": "bia",
  "04.01": "otto",
  "04.02": "otto",
  "04.03": "otto",
  "05.01": "kiwi",
  "05.02": "kiwi",
  "06.01": "max",
  "06.02": "max",
  "06.03": "max",
  "07.02": "iris",
  "07.03": "iris",
  "07.04": "iris",
} as const satisfies Record<string, AgentId>;

export type DeliveryType = keyof typeof DELIVERY_OWNER;

type Key<T extends string> = T extends `${infer A}.${infer B}` ? `d${A}${B}` : never;
/** Chave do catálogo ("04.01" → "d0401"): o next-intl não aceita "." em chave. */
export type DeliveryTypeKey = Key<DeliveryType>;

export function isDeliveryType(type: string | null | undefined): type is DeliveryType {
  return !!type && Object.prototype.hasOwnProperty.call(DELIVERY_OWNER, type);
}

/** Chave do catálogo para um tipo de entrega ("04.01" → "d0401"); null para o que o squad ainda não executa. */
export function deliveryTypeKey(type: string | null | undefined): DeliveryTypeKey | null {
  return isDeliveryType(type) ? (`d${type.replace(".", "")}` as DeliveryTypeKey) : null;
}

/** Entrega em texto corrido (a legenda da 04.01); as outras são documentos revisáveis por seção. */
export function isDocumentDelivery(type: string | null | undefined): type is Exclude<DeliveryType, "04.01"> {
  return isDeliveryType(type) && type !== "04.01";
}

/**
 * Projeto coordenado (S2d): o trabalho do Nexo com a entrega 01.02 ("Coordenar projeto com múltiplos agentes"). O
 * Nexo monta a equipe e as etapas; cada etapa tem a entrega do especialista dela (`steps[].delivery_type`).
 */
export const COORDINATED_DELIVERY = "01.02";
export type RequestDelivery = DeliveryType | typeof COORDINATED_DELIVERY;

export function isCoordinated(type: string | null | undefined): type is typeof COORDINATED_DELIVERY {
  return type === COORDINATED_DELIVERY;
}

/** Quem responde pelo pedido: o dono da entrega ou, no projeto coordenado, o Nexo. */
export function requestOwner(type: RequestDelivery): AgentId {
  return isCoordinated(type) ? "nexo" : DELIVERY_OWNER[type];
}
