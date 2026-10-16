import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AutonomyView } from "@/components/auto/AutonomyView";
import { renderWithShell } from "./render";

describe("Modo Autônomo sem nenhuma responsabilidade (V4.6, primeiro acesso)", () => {
  it("mostra o cabeçalho, o vazio e nenhum interruptor nem resumo", () => {
    renderWithShell(<AutonomyView business="Miolo" />);
    expect(screen.getByRole("heading", { level: 1, name: "Modo Autônomo" })).toBeInTheDocument();
    expect(screen.getByText("Deixe por conta do squad o que se repete. Você define os limites.")).toBeInTheDocument();
    // O interruptor só existe com responsabilidade ativa ou pausada; o resumo, só com responsabilidades.
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByText("Fazendo sozinho")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Responsabilidades" })).toBeInTheDocument();
    expect(screen.getByText("o que o squad faz sozinho, em ciclos")).toBeInTheDocument();
    expect(screen.getByText("Nada delegado ainda.")).toBeInTheDocument();
    expect(
      screen.getByText("Comece pelo que mais se repete na sua semana. O squad conversa com você, mostra o combinado e só ativa depois do seu ok."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delegar a primeira responsabilidade" })).toBeInTheDocument();
  });

  it("explica os três níveis com os textos exatos e o limite de cada um", () => {
    renderWithShell(<AutonomyView business="Miolo" />);
    const levels = screen.getByRole("heading", { name: "Como a autonomia funciona" }).closest("section") as HTMLElement;
    expect(within(levels).getByText("três níveis, cada um com o seu limite")).toBeInTheDocument();
    const items = within(levels).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "AnalisarPesquisa, acompanha e interpreta informações, só nas contas que você conectou.Faz sozinho",
      "PrepararCria rascunhos, planos, peças e relatórios a cada ciclo, sem você pedir de novo.Faz sozinho · você aprova o que sai",
      "ExecutarPublicar, enviar mensagens, alterar campanhas e investir só acontecem com a autorização específica de cada ação.Só com a sua autorização",
    ]);
    expect(
      within(levels).getByText(
        "Aprovar um conteúdo não autoriza publicar, enviar mensagens, alterar campanhas ou investir. Cada uma dessas ações pede a sua própria autorização.",
      ),
    ).toBeInTheDocument();
    // "Nunca" só aparece no detalhe de uma responsabilidade (Limites da autonomia), que o primeiro acesso não tem.
    expect(within(levels).queryByText("Nunca")).not.toBeInTheDocument();
  });

  it("oferece os quatro modelos e mostra o vazio das execuções", () => {
    renderWithShell(<AutonomyView business="Miolo" />);
    expect(screen.getByText("cada delegação começa numa conversa")).toBeInTheDocument();
    for (const title of [
      "Planejar meus conteúdos toda semana",
      "Preparar posts toda segunda-feira",
      "Me avisar quando surgir uma oportunidade",
      "Responder avaliações do Google",
    ]) {
      expect(screen.getByRole("button", { name: `Delegar: ${title}` })).toBeInTheDocument();
    }
    expect(screen.getByText("Respostas no tom de Miolo, para você aprovar.")).toBeInTheDocument();
    expect(screen.getByText("Nada programado. Quando você delegar algo, as execuções aparecem aqui.")).toBeInTheDocument();
    expect(
      screen.getByText("Cada execução fica registrada aqui, com o que foi feito, o que falhou e o trabalho que gerou."),
    ).toBeInTheDocument();
  });

  it("delegar ainda não existe (rotinas são da Fase 3): avisa em vez de fingir", async () => {
    const { shell } = renderWithShell(<AutonomyView business="Miolo" />);
    await userEvent.click(screen.getByRole("button", { name: "Delegar uma responsabilidade" }));
    await userEvent.click(screen.getByRole("button", { name: "Delegar a primeira responsabilidade" }));
    await userEvent.click(screen.getByRole("button", { name: "Delegar: Responder avaliações do Google" }));
    expect(shell.toast).toHaveBeenCalledTimes(3);
    expect(shell.toast).toHaveBeenCalledWith("Ainda não disponível nesta versão.", "nexo");
  });
});
