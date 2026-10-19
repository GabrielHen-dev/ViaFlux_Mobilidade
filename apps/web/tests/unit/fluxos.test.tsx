import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import NovoChamado from "@/components/forms/NovoChamado";
import Dashboard from "@/components/chamados/Dashboard";
import SeletorDeArquivos from "@/components/forms/SeletorDeArquivos";
import { abrirChamado } from "@/services/api/chamados";
import { requisitarApi } from "@/services/api/cliente";
import { render } from "@testing-library/react";
import { USUARIOS, tokenDeAcesso } from "../support/backendFalso";
import { derrubarRede, ligarBackendFalso, renderizarComo } from "../support/renderizar";

type Usuario = typeof userEvent extends { setup: (...args: never[]) => infer U } ? U : never;

async function preencherAbertura(usuario: Usuario) {
  await usuario.selectOptions(await screen.findByLabelText("Motivo *"), "Veículo não liga / Pane elétrica ou mecânica");
  const contexto = screen.getByLabelText("Contexto situacional *");
  await waitFor(() => expect(contexto).toBeEnabled());
  await usuario.selectOptions(contexto, "Veículo parado em rodovia, via rápida ou local de risco");
  await usuario.type(screen.getByLabelText("Descrição *"), "Caminhão parou no acostamento da BR-116.");
}

describe("abertura de chamado", () => {
  it("lista os campos a corrigir antes de enviar", async () => {
    const usuario = userEvent.setup();
    ligarBackendFalso();
    await renderizarComo(USUARIOS.cliente, <NovoChamado />);
    await usuario.click(screen.getByRole("button", { name: "Abrir Chamado" }));
    const resumo = await screen.findByText("Corrija os campos antes de enviar:");
    const itens = within(resumo.parentElement as HTMLElement).getAllByRole("listitem").map((item) => item.textContent);
    expect(itens).toEqual(expect.arrayContaining([expect.stringMatching(/^Motivo/), expect.stringMatching(/^Contexto situacional/), expect.stringMatching(/^Descrição/)]));
    expect(screen.getByLabelText("Motivo *")).toHaveAttribute("aria-invalid", "true");
  });

  it("mostra o protocolo e a prioridade calculada só depois da confirmação do servidor", async () => {
    const usuario = userEvent.setup();
    ligarBackendFalso();
    await renderizarComo(USUARIOS.cliente, <NovoChamado />);
    await preencherAbertura(usuario);
    await usuario.click(screen.getByRole("button", { name: "Abrir Chamado" }));
    expect(await screen.findByRole("heading", { name: "Chamado aberto!" })).toBeInTheDocument();
    expect(screen.getByTestId("protocolo")).toHaveTextContent("VF-0000");
    expect(screen.getByText("P1 · Crítica")).toBeInTheDocument();
    expect(screen.getByText("Assistência 24h")).toBeInTheDocument();
  });

  it("em falha de rede avisa que o envio não foi confirmado, mantém os dados e reenvia sem duplicar", async () => {
    const usuario = userEvent.setup();
    const { backend } = ligarBackendFalso();
    await renderizarComo(USUARIOS.cliente, <NovoChamado />);
    await preencherAbertura(usuario);
    derrubarRede();
    await usuario.click(screen.getByRole("button", { name: "Abrir Chamado" }));
    expect(await screen.findByText(/Envio não confirmado/)).toBeInTheDocument();
    expect(screen.getByLabelText("Descrição *")).toHaveValue("Caminhão parou no acostamento da BR-116.");
    expect(screen.queryByRole("heading", { name: "Chamado aberto!" })).not.toBeInTheDocument();

    ligarBackendFalso(backend);
    await usuario.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByRole("heading", { name: "Chamado aberto!" })).toBeInTheDocument();
    expect(backend.contagem.aberturas).toBe(1);
  });

  it("recupera o rascunho salvo no navegador depois de recarregar a tela", async () => {
    const usuario = userEvent.setup();
    ligarBackendFalso();
    const primeira = await renderizarComo(USUARIOS.cliente, <NovoChamado />);
    await usuario.type(screen.getByLabelText("Descrição *"), "Texto que não pode se perder");
    primeira.unmount();
    await renderizarComo(USUARIOS.cliente, <NovoChamado />);
    expect(await screen.findByText(/Recuperamos o rascunho/)).toBeInTheDocument();
    expect(screen.getByLabelText("Descrição *")).toHaveValue("Texto que não pode se perder");
  });
});

describe("abertura pela Central", () => {
  it("exige escolher o cliente e registra o chamado no nome dele", async () => {
    const usuario = userEvent.setup();
    const { backend } = ligarBackendFalso();
    await renderizarComo(USUARIOS.admin, <NovoChamado />);
    await preencherAbertura(usuario);
    await usuario.click(screen.getByRole("button", { name: "Abrir Chamado" }));
    expect(await screen.findByRole("link", { name: "Cliente solicitante" })).toBeInTheDocument();

    const seletor = screen.getByLabelText("Cliente solicitante *");
    await waitFor(() => expect(within(seletor).getByRole("option", { name: /Carla Cliente/ })).toBeInTheDocument());
    await usuario.selectOptions(seletor, "u-cliente");
    expect(screen.getByLabelText("Nome *")).toHaveValue("Carla Cliente");
    await usuario.click(screen.getByRole("button", { name: "Abrir Chamado" }));
    expect(await screen.findByRole("heading", { name: "Chamado aberto!" })).toBeInTheDocument();
    expect(backend.chamados[0].solicitanteId).toBe("u-cliente");
    expect(screen.getByRole("link", { name: "Acompanhar chamado" })).toHaveAttribute("href", "/chamados/VF-0000");
  });
});

describe("dashboard", () => {
  async function criarChamados() {
    const { backend } = ligarBackendFalso();
    const comoCliente = { Authorization: `Bearer ${tokenDeAcesso(USUARIOS.cliente)}` };
    const api = {
      requisitar: <T,>(caminho: string, init: RequestInit = {}) => requisitarApi<T>(caminho, { ...init, headers: { ...comoCliente, ...(init.headers as Record<string, string>) } }),
      baixar: () => Promise.reject(new Error("não usado")),
    };
    const base = { cliente: "Carla", telefone: "", modelo: "", placa: "", localizacao: null };
    await abrirChamado(api, { ...base, motivoId: "M-ASSISTENCIA_24H-1", contextoId: "C-ASSISTENCIA_24H-1", descricao: "Pane na rodovia" }, "p1");
    await abrirChamado(api, { ...base, motivoId: "M-FINANCEIRO-5", contextoId: "C-FINANCEIRO-5", descricao: "Dúvida de cobrança" }, "p4");
    return backend;
  }

  it("destaca P1 sem 1ª resposta, mostra contadores e combina filtros", async () => {
    const usuario = userEvent.setup();
    await criarChamados();
    await renderizarComo(USUARIOS.atendente, <Dashboard />);
    expect(await screen.findByText(/P1 sem 1ª resposta \(1\)/)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "#VF-0000" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "#VF-0001" })).toBeInTheDocument();
    await usuario.selectOptions(screen.getByLabelText("Filtrar por prioridade"), "P4");
    await waitFor(() => expect(screen.queryByRole("link", { name: "#VF-0000" })).not.toBeInTheDocument());
    expect(screen.getByRole("link", { name: "#VF-0001" })).toBeInTheDocument();
    await usuario.selectOptions(screen.getByLabelText("Filtrar por departamento"), "TI");
    expect(await screen.findByText("Nenhum chamado encontrado com os filtros aplicados.")).toBeInTheDocument();
  });

  it("renova o token expirado e repete a consulta sem tirar o usuário da tela", async () => {
    const usuario = userEvent.setup();
    const backend = await criarChamados();
    await renderizarComo(USUARIOS.atendente, <Dashboard />);
    await screen.findByRole("link", { name: "#VF-0000" });
    const renovacoesAntes = backend.contagemDeRenovacoes.total;
    backend.expirarTokensDeAcesso();
    await usuario.click(screen.getByRole("button", { name: "Atualizar" }));
    await waitFor(() => expect(backend.contagemDeRenovacoes.total).toBeGreaterThan(renovacoesAntes));
    expect(screen.getByRole("link", { name: "#VF-0000" })).toBeInTheDocument();
    expect(screen.queryByText(/sessão expirou/i)).not.toBeInTheDocument();
  });
});

describe("seleção de anexos", () => {
  it("aceita PNG e PDF e explica por que rejeitou os outros arquivos", async () => {
    const usuario = userEvent.setup({ applyAccept: false });
    const aceitos: File[] = [];
    render(<SeletorDeArquivos aoAceitar={(arquivos) => aceitos.push(...arquivos)} />);
    await usuario.upload(screen.getByLabelText("Selecionar anexos"), [
      new File(["foto"], "veiculo.png", { type: "image/png" }),
      new File(["%PDF"], "laudo.pdf", { type: "application/pdf" }),
      new File(["texto"], "notas.txt", { type: "text/plain" }),
    ]);
    expect(aceitos.map((arquivo) => arquivo.name)).toEqual(["veiculo.png", "laudo.pdf"]);
    expect(screen.getByRole("alert")).toHaveTextContent('"notas.txt" não foi aceito: envie fotos PNG ou JPG, ou documentos PDF.');
    expect(screen.getByLabelText("Tirar foto com a câmera")).toHaveAttribute("capture", "environment");
  });
});
