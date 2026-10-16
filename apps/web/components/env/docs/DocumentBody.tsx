"use client";

import type { DeliveryType } from "@/lib/delivery-types";
import { CrmDoc } from "./CrmDoc";
import { EditorialDoc } from "./EditorialDoc";
import { GrowthDoc } from "./GrowthDoc";
import { ResultsDoc } from "./ResultsDoc";
import { StrategyDoc } from "./StrategyDoc";

/** O que todo documento recebe: o tipo da entrega, o conteúdo da versão (como o worker gravou) e o nome do negócio. */
export type DocProps = { type: DeliveryType; content: Record<string, unknown>; business: string };

/**
 * Corpo de um documento revisável (A2b): cada família de entrega tem o seu leitor, com as seções na ordem do formato
 * que o worker grava (`apps/backend/src/hellosquad/squad/deliveries.py` e os acréscimos de `flow.py`). Só mostra o que
 * a versão traz; nada é completado na tela.
 */
export function DocumentBody(props: DocProps) {
  switch (props.type) {
    case "02.01":
    case "02.02":
    case "02.03":
    case "02.04":
    case "02.07":
      return <StrategyDoc {...props} />;
    case "04.02":
    case "04.03":
      return <EditorialDoc {...props} />;
    case "05.01":
    case "05.02":
      return <GrowthDoc {...props} />;
    case "06.01":
    case "06.02":
    case "06.03":
      return <CrmDoc {...props} />;
    case "07.02":
    case "07.03":
    case "07.04":
      return <ResultsDoc {...props} />;
    default:
      return null;
  }
}
