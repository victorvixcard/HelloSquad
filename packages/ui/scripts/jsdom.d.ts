// Tipos mínimos do jsdom para scripts/extract-landing.ts (o pacote não traz os seus; @types/jsdom não está instalado).
declare module "jsdom" {
  export class JSDOM {
    constructor(html?: string);
    window: Window & typeof globalThis;
  }
}
