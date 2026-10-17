// @vitest-environment node
// A landing portada renderiza no servidor (sem window): o HTML traz o texto das seções da R32.
import * as React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createHelloSquad, createLandingComponent, DCHost, DCLogic, identity, LANDING_TEMPLATE } from "../src/landing";

describe("landing R32 no servidor", () => {
  it("renderiza o estado inicial com as seções e os títulos da R32", () => {
    const HS = createHelloSquad(React);
    const doc = { createElement: () => ({ getContext: () => ({ measureText: (s: string) => ({ width: s.length * 8 }) }) }), querySelector: () => null, querySelectorAll: () => [] };
    const Logic = createLandingComponent(DCLogic, React, { HelloSquad: HS }, doc, () => "sans-serif");
    const html = renderToString(React.createElement(DCHost, { name: "LandingPageV1", Logic, template: LANDING_TEMPLATE, ctx: { components: HS, tr: identity } }));
    for (const id of ["topo", "demo", "squad", "autonomo", "memoria", "resultados", "porque", "faq", "comecar"]) expect(html).toContain(`id="${id}"`);
    expect(html).toContain("Do pedido à entrega.");
    expect(html).toContain("Seu marketing, em modo autônomo.");
    expect(html).toContain("Dúvidas antes</span> <span>de começar?</span>");
    expect(html).not.toContain("{{");
  });
});
