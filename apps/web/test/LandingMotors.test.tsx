// Os motores da landing portada (classe Component da R32) ligam no cliente como no protótipo: o Hero digita e envia
// sozinho ~3 s depois de carregar, para quando a pessoa escreve, e o movimento reduzido desliga a animação.
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LandingR32 } from "@/components/landing/LandingR32";

const FIRST_CHIP = "Criar uma campanha para o fim de semana";
const HERO_DEFAULT = "Quero criar uma campanha para minha marca.";

function stubBrowser(reduced: boolean) {
  window.matchMedia = vi.fn((q: string) => ({
    matches: reduced && q.includes("reduce"),
    media: q,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  // O jsdom não tem ResizeObserver, canvas nem Web Animations; o navegador real tem (o protótipo usa os três).
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  HTMLCanvasElement.prototype.getContext = (() => ({ font: "", measureText: (s: string) => ({ width: s.length * 8 }) })) as never;
  Element.prototype.animate = (() => ({ cancel() {}, finish() {}, play() {}, pause() {}, onfinish: null, finished: Promise.resolve() })) as never;
  window.scrollTo = (() => {}) as never;
  // Nem a geometria de SVG (o protótipo converte pontos de tela para o SVG do palco).
  const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse: () => matrix, multiply: () => matrix };
  const proto = SVGElement.prototype as unknown as Record<string, unknown>;
  proto.getScreenCTM = () => matrix;
  proto.getCTM = () => matrix;
  proto.createSVGPoint = () => ({ x: 0, y: 0, matrixTransform(this: { x: number; y: number }) { return { x: this.x, y: this.y }; } });
  proto.getTotalLength = () => 100;
  proto.getPointAtLength = () => ({ x: 0, y: 0 });
  proto.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 });
}

const field = () => document.querySelector<HTMLInputElement>(".lp-hero .hs-input")!;
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("motores da landing R32 (L1)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "performance", "Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("o Hero começa a digitar sozinho perto de 3 s depois de carregar e envia o exemplo", async () => {
    stubBrowser(false);
    render(<LandingR32 />);
    expect(field()).toBeInTheDocument();
    await advance(2500);
    expect(field().value).toBe("");
    await advance(1500);
    const typed = field().value;
    expect(typed.length).toBeGreaterThan(0);
    expect(FIRST_CHIP.startsWith(typed)).toBe(true);
    await advance(4000);
    // Depois do envio, a sequência pedido → coordenação → especialistas toma o Hero (fases is-ph-*).
    expect(document.querySelector("#topo")!.className).toMatch(/is-ph-/);
  });

  it("para quando a pessoa escreve no campo antes do motor", async () => {
    stubBrowser(false);
    render(<LandingR32 />);
    await advance(1000);
    fireEvent.change(field(), { target: { value: "Quero um post para sábado" } });
    await advance(6000);
    expect(field().value).toBe("Quero um post para sábado");
    expect(document.querySelector("#topo")!.className).not.toMatch(/is-ph-/);
  });

  it("a faixa de sugestões para no cursor e no foco e volta a andar quando eles saem", async () => {
    stubBrowser(false);
    // A faixa anda por animação CSS (.hs-track); o motor segura e solta pelo playbackRate dela.
    const track = { playbackRate: 1, currentTime: 0, effect: { getTiming: () => ({ duration: 40000 }) }, cancel() {}, play() {}, pause() {} };
    (Element.prototype as unknown as { getAnimations: () => unknown[] }).getAnimations = function (this: Element) {
      return this.classList.contains("hs-track") ? [track] : [];
    };
    render(<LandingR32 />);
    const band = document.querySelector(".lp-hband .hs-viewport")!;
    // Antes dos 2,9 s em que o Hero começa a digitar (aí a faixa também para, durante a sequência, como no protótipo).
    await advance(100);
    fireEvent.mouseEnter(band);
    await advance(800);
    expect(track.playbackRate).toBe(0);
    fireEvent.mouseLeave(band);
    await advance(900);
    expect(track.playbackRate).toBe(1);
    // Foco de teclado numa sugestão (o protótipo segura a faixa só com :focus-visible).
    const chip = band.querySelector<HTMLElement>(".hs-chip")!;
    const matches = Element.prototype.matches;
    Element.prototype.matches = function (this: Element, sel: string) {
      return sel === ":focus-visible" ? document.activeElement === this : matches.call(this, sel);
    };
    act(() => chip.focus());
    await advance(800);
    expect(track.playbackRate).toBe(0);
  });

  it("com movimento reduzido, nada anima: o pedido de exemplo já aparece escrito e não é enviado", async () => {
    stubBrowser(true);
    render(<LandingR32 />);
    await advance(100);
    expect(field().value).toBe(HERO_DEFAULT);
    await advance(8000);
    expect(field().value).toBe(HERO_DEFAULT);
    expect(document.querySelector("#topo")!.className).not.toMatch(/is-ph-/);
  });
});
