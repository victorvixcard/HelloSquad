import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../src";

describe("Button", () => {
  it("primário: Tinta com lábio, rótulo e seta", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Criar conta grátis</Button>);
    const button = screen.getByRole("button", { name: "Criar conta grátis" });
    expect(button).toHaveClass("hs-btn", "hs-btn--pri");
    expect(button).toHaveAttribute("type", "button");
    expect(button.querySelector(".hs-arrow")).not.toBeNull();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("carregando: avisa leitores de tela e não dispara de novo", () => {
    const onClick = vi.fn();
    render(
      <Button state="loading" loadingLabel="Entrando" onClick={onClick}>
        Entrar
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Entrando" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveClass("is-loading");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("pronto: mostra o rótulo de conclusão", () => {
    render(<Button state="done" doneLabel="Feito">Salvar</Button>);
    expect(screen.getByRole("button", { name: "Feito" })).toHaveClass("is-done");
  });

  it("indisponível: desabilitado com o desenho do DS", () => {
    render(<Button disabled>Continuar</Button>);
    const button = screen.getByRole("button", { name: "Continuar" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("is-disabled");
  });

  it("secundário tem o círculo de play; pílula e fantasma só o rótulo", () => {
    render(
      <div>
        <Button variant="secondary">Veja o Squad trabalhando</Button>
        <Button variant="soft">Abrir a Sala do Squad</Button>
        <Button variant="ghost" size="s">Cancelar</Button>
      </div>,
    );
    const secondary = screen.getByRole("button", { name: "Veja o Squad trabalhando" });
    expect(secondary).toHaveClass("hs-btn--sec");
    expect(secondary.querySelector(".hs-play")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Abrir a Sala do Squad" })).toHaveClass("hs-btn--soft");
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveClass("hs-btn--ghost", "hs-btn--s");
  });

  it("type submit envia o formulário", () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Entrar</Button>
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("com href vira link, inclusive com um componente de link próprio", () => {
    const FakeLink = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
      <a href={href} className={className} data-fake="1">
        {children}
      </a>
    );
    render(
      <div>
        <Button href="/criar-conta">Criar conta grátis</Button>
        <Button href="/entrar" variant="soft" linkAs={FakeLink}>
          Entrar
        </Button>
      </div>,
    );
    const link = screen.getByRole("link", { name: "Criar conta grátis" });
    expect(link).toHaveAttribute("href", "/criar-conta");
    expect(link).toHaveClass("hs-btn--pri");
    const custom = screen.getByRole("link", { name: "Entrar" });
    expect(custom).toHaveAttribute("data-fake", "1");
    expect(custom).toHaveClass("hs-btn--soft");
  });
});
