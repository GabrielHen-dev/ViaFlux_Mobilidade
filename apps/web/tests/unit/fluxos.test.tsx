import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import NovoChamado from "@/components/forms/NovoChamado";
import Dashboard from "@/components/chamados/Dashboard";
import SeletorDeArquivos from "@/components/forms/SeletorDeArquivos";
import Triagem from "@/components/forms/Triagem";
import Encaminhamento from "@/components/forms/Encaminhamento";
import DetalhesChamado from "@/components/chamados/DetalhesChamado";
import PortalDoCliente from "@/components/portal/PortalDoCliente";
import ChamadoDoCliente from "@/components/portal/ChamadoDoCliente";
import { type ClienteApi, abrirChamado, alterarStatus, concluirTriagem } from "@/services/api/chamados";
import { requisitarApi } from "@/services/api/cliente";
import { render } from "@testing-library/react";
import { USUARIOS, type UsuarioDeTeste, tokenDeAcesso } from "../support/backendFalso";
import { derrubarRede, ligarBackendFalso, renderizarComo } from "../support/renderizar";

type Usuario = typeof userEvent extends { setup: (...args: never[]) => infer U } ? U : never;

function apiComo(usuario: UsuarioDeTeste): ClienteApi {
  const autorizacao = { Authorization: `Bearer ${tokenDeAcesso(usuario)}` };
  return {
    requisitar: <T,>(caminho: string, init: RequestInit = {}) => requisitarApi<T>(caminho, { ...init, headers: { ...autorizacao, ...(init.headers as Record<string, string>) } }),
    baixar: () => Promise.reject(new Error("não usado")),
  };
}

const ABERTURA_BASE = { cliente: "Carla", telefone: "", modelo: "", placa: "", localizacao: null };

async function abrirPane(chave = "pane") {
  return abrirChamado(apiComo(USUARIOS.cliente), { ...ABERTURA_BASE, motivoId: "M-ASSISTENCIA_24H-1", contextoId: "C-ASSISTENCIA_24H-1", descricao: "Pane na rodovia" }, chave);
}

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

  it("mostra o protocolo e o prazo da triagem, sem prioridade, depois da confirmação do servidor", async () => {
    const usuario = userEvent.setup();
    ligarBackendFalso();
    await renderizarComo(USUARIOS.cliente, <NovoChamado />);
    await preencherAbertura(usuario);
    await usuario.click(screen.getByRole("button", { name: "Abrir Chamado" }));
    expect(await screen.findByRole("heading", { name: "Chamado aberto!" })).toBeInTheDocument();
    expect(screen.getByTestId("protocolo")).toHaveTextContent("VF-0000");
    expect(screen.getByText("Aguardando triagem")).toBeInTheDocument();
    expect(screen.getByTestId("previsao-da-triagem")).toHaveTextContent(/Um atendente vai analisar e classificar o chamado até/);
    expect(screen.queryByText(/P1/)).not.toBeInTheDocument();
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

describe("triagem", () => {
  it("chega sem prioridade, o atendente confirma a sugestão e o chamado vai para a fila do departamento", async () => {
    const usuario = userEvent.setup();
    ligarBackendFalso();
    await abrirPane();
    await renderizarComo(USUARIOS.atendente, <Triagem id="VF-0000" />);
    expect(await screen.findByRole("heading", { name: "Triagem — #VF-0000" })).toBeInTheDocument();
    expect(screen.getByText("sugestão")).toBeInTheDocument();
    expect(screen.getByLabelText("Tipo")).toHaveValue("ASSISTENCIA_24H");
    await usuario.click(screen.getByRole("button", { name: "Assumir triagem" }));
    expect(await screen.findByText("você")).toBeInTheDocument();
    await usuario.click(within(screen.getByRole("group", { name: "Urgência (contexto)" })).getByText("Média (3)"));
    await usuario.click(screen.getByRole("button", { name: "Concluir triagem e encaminhar" }));
    expect(await screen.findByText("Triagem concluída: P2 · encaminhado para Assistência 24h.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar reclassificação" })).toBeInTheDocument();
  });

  it("reclassificar para outro tipo não muda a fila e aponta para a transferência", async () => {
    const usuario = userEvent.setup();
    ligarBackendFalso();
    await abrirPane();
    await concluirTriagem(apiComo(USUARIOS.atendente), "VF-0000", { tipo: "ASSISTENCIA_24H", severidade: 5, urgencia: 5 });
    await renderizarComo(USUARIOS.atendente, <Triagem id="VF-0000" />);
    await usuario.selectOptions(await screen.findByLabelText("Tipo"), "MANUTENCAO");
    expect(screen.getByText(/A reclassificação não muda a fila: o chamado continua em Assistência 24h/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Transferir o chamado" })).toHaveAttribute("href", "/chamados/VF-0000/encaminhamento");
    await usuario.type(screen.getAllByLabelText("Justificativa *")[0], "Problema é mecânico, não de socorro");
    await usuario.click(screen.getByRole("button", { name: "Confirmar reclassificação" }));
    expect(await screen.findByText(/Chamado reclassificado: score 10 · P1/)).toBeInTheDocument();
  });

  it("bloqueia status e transferência enquanto o chamado não foi triado", async () => {
    ligarBackendFalso();
    await abrirPane();
    await renderizarComo(USUARIOS.atendente, <Encaminhamento id="VF-0000" />);
    expect(await screen.findByText(/ainda não passou pela triagem/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fazer triagem" })).toHaveAttribute("href", "/chamados/VF-0000/triagem");
    expect(screen.queryByRole("button", { name: "Transferir" })).not.toBeInTheDocument();
  });

  it("o departamento só vê o chamado depois da triagem", async () => {
    ligarBackendFalso();
    await abrirPane();
    const primeira = await renderizarComo(USUARIOS.departamento, <Dashboard />);
    expect(await screen.findByText("Nenhum chamado encontrado com os filtros aplicados.")).toBeInTheDocument();
    primeira.unmount();
    await concluirTriagem(apiComo(USUARIOS.atendente), "VF-0000", { tipo: "ASSISTENCIA_24H", severidade: 5, urgencia: 5 });
    await renderizarComo(USUARIOS.departamento, <Dashboard />);
    expect(await screen.findByRole("link", { name: "#VF-0000" })).toBeInTheDocument();
    expect(screen.getAllByText("Na fila").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Excluir chamado/ })).not.toBeInTheDocument();
  });
});

describe("o que cada perfil faz no chamado", () => {
  async function chamadoTriado() {
    ligarBackendFalso();
    await abrirPane();
    await concluirTriagem(apiComo(USUARIOS.atendente), "VF-0000", { tipo: "ASSISTENCIA_24H", severidade: 5, urgencia: 5 });
  }

  it("o departamento assume e passa a constar como responsável", async () => {
    const usuario = userEvent.setup();
    await chamadoTriado();
    await renderizarComo(USUARIOS.departamento, <DetalhesChamado id="VF-0000" />);
    expect(await screen.findByText("Ninguém assumiu ainda")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Assumir chamado" }));
    expect(await screen.findByText("Você")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Assumir chamado" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Transferir / status" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Excluir/ })).not.toBeInTheDocument();
  });

  it("outra pessoa da fila pode assumir no lugar de quem está com o chamado", async () => {
    const usuario = userEvent.setup();
    await chamadoTriado();
    await renderizarComo(USUARIOS.departamento, <DetalhesChamado id="VF-0000" />);
    await usuario.click(await screen.findByRole("button", { name: "Assumir chamado" }));
    await screen.findByText("Você");
    cleanup();
    await renderizarComo(USUARIOS.admin, <DetalhesChamado id="VF-0000" />);
    await usuario.click(await screen.findByRole("button", { name: "Assumir no lugar de Davi Departamento" }));
    expect(await screen.findByText("Você")).toBeInTheDocument();
  });

  it("o atendente pode assumir, alterar o status e acionar fornecedor", async () => {
    await chamadoTriado();
    await renderizarComo(USUARIOS.atendente, <DetalhesChamado id="VF-0000" />);
    expect(await screen.findByRole("link", { name: "Transferir / status" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Assumir chamado" })).toBeInTheDocument();
    expect(screen.getByLabelText("Alterar status")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Incluir serviço terceirizado" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Excluir/ })).toBeInTheDocument();
  });

  it("altera o status pelo menu até fechar o chamado resolvido", async () => {
    const usuario = userEvent.setup();
    await chamadoTriado();
    await renderizarComo(USUARIOS.atendente, <DetalhesChamado id="VF-0000" />);

    await usuario.selectOptions(await screen.findByLabelText("Alterar status"), "Em atendimento");
    await usuario.click(screen.getByRole("button", { name: "Atualizar status" }));
    await screen.findByText("Status alterado para Em atendimento");

    await usuario.selectOptions(screen.getByLabelText("Alterar status"), "Aguardando");
    await usuario.selectOptions(screen.getByLabelText("Aguardando quem? *"), "FORNECEDOR");
    await usuario.click(screen.getByRole("button", { name: "Atualizar status" }));
    await screen.findByText("Status alterado para Aguardando");

    await usuario.selectOptions(screen.getByLabelText("Alterar status"), "Resolvido");
    await usuario.type(screen.getByLabelText("Resumo da solução *"), "Veículo reparado e entregue ao cliente.");
    await usuario.click(screen.getByRole("button", { name: "Atualizar status" }));
    await screen.findByText("Status alterado para Resolvido");

    await usuario.selectOptions(screen.getByLabelText("Alterar status"), "Fechado");
    await usuario.click(screen.getByRole("button", { name: "Atualizar status" }));
    expect(await screen.findByText("Este chamado está fechado.")).toBeInTheDocument();
  });

  it("o líder só acompanha: sem ações, sem registrar atualização e sem enviar anexos", async () => {
    await chamadoTriado();
    await renderizarComo(USUARIOS.lider, <DetalhesChamado id="VF-0000" />);
    expect(await screen.findByRole("heading", { name: "#VF-0000" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Assumir chamado" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Transferir/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Excluir/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Incluir serviço terceirizado" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Adicionar atualização ao histórico")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Selecionar anexos")).not.toBeInTheDocument();
  });
});

describe("dashboard", () => {
  async function criarChamados() {
    const { backend } = ligarBackendFalso();
    const comoCliente = apiComo(USUARIOS.cliente);
    const comoAtendente = apiComo(USUARIOS.atendente);
    await abrirChamado(comoCliente, { ...ABERTURA_BASE, motivoId: "M-ASSISTENCIA_24H-1", contextoId: "C-ASSISTENCIA_24H-1", descricao: "Pane na rodovia" }, "p1");
    await abrirChamado(comoCliente, { ...ABERTURA_BASE, motivoId: "M-FINANCEIRO-5", contextoId: "C-FINANCEIRO-5", descricao: "Dúvida de cobrança" }, "p4");
    await abrirChamado(comoCliente, { ...ABERTURA_BASE, motivoId: "M-TI-5", contextoId: "C-TI-5", descricao: "Reset de senha" }, "triagem");
    await concluirTriagem(comoAtendente, "VF-0000", { tipo: "ASSISTENCIA_24H", severidade: 5, urgencia: 5 });
    await concluirTriagem(comoAtendente, "VF-0001", { tipo: "FINANCEIRO", severidade: 1, urgencia: 1 });
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

  it("conta as exceções na fila ativa e filtra os chamados que aguardam triagem", async () => {
    const usuario = userEvent.setup();
    await criarChamados();
    await renderizarComo(USUARIOS.atendente, <Dashboard />);
    const contadores = await screen.findByRole("region", { name: "Fila ativa" });
    expect(within(contadores).getByText("exceções").previousSibling).toHaveTextContent("1");
    expect(screen.getByRole("region", { name: "SLA · 1ª resposta" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "SLA · resolução" })).toBeInTheDocument();
    await usuario.selectOptions(screen.getByLabelText("Filtrar por etapa"), "TRIAGEM");
    await waitFor(() => expect(screen.queryByRole("link", { name: "#VF-0000" })).not.toBeInTheDocument());
    expect(screen.getByRole("link", { name: "#VF-0002" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Triar" })).toHaveAttribute("href", "/chamados/VF-0002/triagem");
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

describe("meus chamados", () => {
  it("mantém o fechado visível depois do chamado aberto", async () => {
    ligarBackendFalso();
    await abrirPane("fechado");
    await abrirPane("aberto");
    const atendente = apiComo(USUARIOS.atendente);
    await concluirTriagem(atendente, "VF-0000", { tipo: "ASSISTENCIA_24H", severidade: 5, urgencia: 5 });
    await alterarStatus(atendente, "VF-0000", { status: "Resolvido", resumoResolucao: "Veículo reparado e entregue." });
    await alterarStatus(atendente, "VF-0000", { status: "Fechado" });

    await renderizarComo(USUARIOS.cliente, <PortalDoCliente />);
    await screen.findByRole("link", { name: /VF-0000/ });
    const chamados = screen.getAllByRole("link").filter((link) => link.getAttribute("href")?.startsWith("/portal/chamados/"));
    expect(chamados.map((link) => link.getAttribute("href"))).toEqual(["/portal/chamados/VF-0001", "/portal/chamados/VF-0000"]);
    expect(chamados[1]).toHaveTextContent("Fechado");
  });

  async function chamadoResolvidoDoCliente() {
    ligarBackendFalso();
    await abrirPane();
    const atendente = apiComo(USUARIOS.atendente);
    await concluirTriagem(atendente, "VF-0000", { tipo: "ASSISTENCIA_24H", severidade: 5, urgencia: 5 });
    await alterarStatus(atendente, "VF-0000", { status: "Resolvido", resumoResolucao: "Bateria substituída no local." });
  }

  it("o cliente confirma a solução e depois pode reabrir o chamado", async () => {
    const usuario = userEvent.setup();
    await chamadoResolvidoDoCliente();
    await renderizarComo(USUARIOS.cliente, <ChamadoDoCliente id="VF-0000" />);

    expect(await screen.findByText("Bateria substituída no local.")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Confirmar solução" }));
    await usuario.click(await screen.findByRole("button", { name: "Reabrir chamado" }));
    await usuario.type(screen.getByLabelText("Por que reabrir? *"), "O motor voltou a falhar hoje cedo.");
    await usuario.click(screen.getByRole("button", { name: "Reabrir chamado" }));

    expect(await screen.findByText("Chamado reaberto pelo solicitante")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar solução" })).not.toBeInTheDocument();
  });

  it("o cliente contesta a solução e o chamado volta para atendimento", async () => {
    const usuario = userEvent.setup();
    await chamadoResolvidoDoCliente();
    await renderizarComo(USUARIOS.cliente, <ChamadoDoCliente id="VF-0000" />);

    await usuario.click(await screen.findByRole("button", { name: "Ainda não resolveu" }));
    const enviar = screen.getByRole("button", { name: "Enviar e voltar ao atendimento" });
    expect(enviar).toBeDisabled();
    await usuario.type(screen.getByLabelText("O que ainda não foi resolvido? *"), "A luz de alerta continua acesa.");
    await usuario.click(enviar);

    expect(await screen.findByText("Solução contestada pelo solicitante")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar solução" })).not.toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Tirar foto com a câmera" })).toBeEnabled();
  });
});
