// Landing V1 (R32) portada por script: template, classe Component e bundle do DS gerados, e o interpretador.
// Entrada separada (@hellosquad/ui/landing) para que o peso da landing não entre nas outras telas.
import type { ComponentType } from "react";
import { createHelloSquad as dsFactory } from "../generated/ds-bundle-runtime";
import { createLandingComponent as logicFactory } from "../generated/landing-logic";
import type { DCLogic, LogicClass } from "./runtime";

export { DCHost, DCLogic, evaluate, identity, parseStyle, renderNodes, type DCHostProps, type LogicClass, type RenderCtx, type Translate } from "./runtime";
export type { TplNode, TplProp } from "./template-types";
export { LANDING_TEMPLATE } from "../generated/landing-template";

export type DsComponents = Record<string, ComponentType<Record<string, unknown>>>;

/** Os componentes do bundle do DS (HelloSquad.Button, Agent, CommandField…), criados com o React de quem chama. */
export const createHelloSquad = dsFactory as unknown as (react: unknown) => DsComponents;

/** A classe Component do protótipo, com o que o runtime dava a ela: DCLogic, React, window, document e a fonte do canvas. */
export const createLandingComponent = logicFactory as unknown as (
  base: typeof DCLogic,
  react: unknown,
  win: unknown,
  doc: unknown,
  canvasFont: () => string,
) => LogicClass;
