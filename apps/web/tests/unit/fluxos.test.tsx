import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ChamadosProvider, useChamados } from "@/store/ChamadosContext";
import NovoChamado from "@/components/forms/NovoChamado";
import Dashboard from "@/components/chamados/Dashboard";
import AnexosInput from "@/components/forms/AnexosInput";
import { useState } from "react";
import type { Anexo } from "@/types/chamado";

function EstadoVisivel() {
  const { chamados, lixeira, proximoId } = useChamados();
  return <div data-testid="estado">{chamados.length} chamados · {lixeira.length} excluídos · {proximoId}<span>{chamados[0].cliente} · {chamados[0].placa}</span></div>;
}
function AnexosDemo() {
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  return <AnexosInput anexos={anexos} onAdicionar={(novos) => setAnexos((prev) => [...prev, ...novos])} />;
}

describe("interações da interface", () => {
  it("valida campos e cria um chamado com confirmação e número sequencial", async () => {
    const user = userEvent.setup();
    render(<ChamadosProvider><NovoChamado /><EstadoVisivel /></ChamadosProvider>);
    expect(screen.getByRole("button", { name: "Abrir Chamado" })).toBeDisabled();
    await user.type(screen.getByLabelText("Nome *"), "   ");
    await user.type(screen.getByLabelText("Modelo *"), "Volvo");
    await user.selectOptions(screen.getByLabelText("Tipo do problema *"), "Mecânico");
    expect(screen.getByRole("button", { name: "Abrir Chamado" })).toBeDisabled();
    await user.clear(screen.getByLabelText("Nome *"));
    await user.type(screen.getByLabelText("Nome *"), "  Cliente Teste  ");
    await user.type(screen.getByLabelText("Placa"), "abc-1234");
    await user.click(screen.getByRole("button", { name: "Abrir Chamado" }));
    expect(screen.getByRole("heading", { name: "Chamado aberto!" })).toBeInTheDocument();
    expect(screen.getByTestId("estado")).toHaveTextContent("6 chamados · 0 excluídos · VF-1026");
    expect(screen.getByTestId("estado")).toHaveTextContent("Cliente Teste · ABC-1234");
    await user.click(screen.getByRole("button", { name: "Novo chamado" }));
    expect(screen.getByLabelText("Nome *")).toHaveValue("");
    expect(screen.getByRole("heading", { name: /VF-1026/ })).toBeInTheDocument();
  });
  it("combina busca, status e prioridade e apresenta estado vazio", async () => {
    const user = userEvent.setup();
    render(<ChamadosProvider><Dashboard /></ChamadosProvider>);
    await user.type(screen.getByRole("textbox", { name: "Buscar chamados" }), "Ricardo");
    expect(screen.getByText("Ricardo Almeida")).toBeInTheDocument();
    expect(screen.queryByText("Fernanda Costa")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Alta$/ }));
    expect(screen.getByText("Nenhum chamado encontrado com os filtros aplicados.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Crítica$/ }));
    await user.click(screen.getByRole("button", { name: /^Em atendimento$/ }));
    expect(screen.getByText("Ricardo Almeida")).toBeInTheDocument();
  });
  it("exige confirmação na tabela e permite cancelar a exclusão", async () => {
    const user = userEvent.setup();
    render(<ChamadosProvider><Dashboard /><EstadoVisivel /></ChamadosProvider>);
    await user.click(screen.getByRole("button", { name: "Excluir chamado VF-1024" }));
    expect(screen.getByTestId("estado")).toHaveTextContent("5 chamados · 0 excluídos");
    await user.click(screen.getByRole("button", { name: "Cancelar exclusão" }));
    expect(screen.queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Excluir chamado VF-1024" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(screen.getByTestId("estado")).toHaveTextContent("4 chamados · 1 excluídos");
  });
  it("registra metadados dos anexos e rejeita arquivos acima de 10 MB", async () => {
    const user = userEvent.setup();
    render(<AnexosDemo />);
    await user.upload(screen.getByLabelText("Selecionar anexos"), new File(["foto"], "veiculo.png", { type: "image/png" }));
    expect(screen.getByText("veiculo.png")).toBeInTheDocument();
    const arquivoGrande = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "grande.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText("Selecionar anexos"), arquivoGrande);
    expect(screen.getByRole("alert")).toHaveTextContent("Cada arquivo deve ter no máximo 10 MB.");
    expect(screen.queryByText("grande.pdf")).not.toBeInTheDocument();
    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(1);
  });
});
