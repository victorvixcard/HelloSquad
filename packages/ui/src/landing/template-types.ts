// Árvore do template de um Design Component (.dc.html), como scripts/extract-landing.ts a grava.
// Texto pode ter lacunas {{caminho}}; os valores crus dos atributos são resolvidos na hora de renderizar.
export type TplProp = [name: string, raw: string | true];
export type TplNode =
  | string
  | { t: "for"; list: string; as: string; c: TplNode[] }
  | { t: "if"; v: string; c: TplNode[] }
  | { t: "x"; n: string; p: TplProp[]; s: string | null; c: TplNode[] }
  | { t: "el"; tag: string; p: TplProp[]; c: TplNode[] };
