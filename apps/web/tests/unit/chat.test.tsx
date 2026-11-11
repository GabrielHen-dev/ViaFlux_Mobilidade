import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ChamadoDoCliente from "@/components/portal/ChamadoDoCliente";
import DetalhesChamado from "@/components/chamados/DetalhesChamado";
import { type ClienteApi, abrirChamado, alterarStatus, assumirAtendimento, concluirTriagem, registrarAtualizacao } from "@/services/api/chamados";
import { requisitarApi } from "@/services/api/cliente";
import { vincularServico } from "@/services/api/operacao";
import { USUARIOS, type UsuarioDeTeste, tokenDeAcesso } from "../support/backendFalso";
import { ligarBackendFalso, renderizarComo } from "../support/renderizar";

const CODIGO = "VF-0000";

function apiComo(usuario: UsuarioDeTeste): ClienteApi {
  const autorizacao = { Authorization: `Bearer ${tokenDeAcesso(usuario)}` };
  return {
    requisitar: <T,>(caminho: string, init: RequestInit = {}) => requisitarApi<T>(caminho, { ...init, headers: { ...autorizacao, ...(init.headers as Record<string, string>) } }),
    baixar: () => Promise.reject(new Error("não usado")),
  };
}

async function chamadoNaFila() {
  ligarBackendFalso();
  await abrirChamado(apiComo(USUARIOS.cliente), {
    cliente: "Carla", telefone: "", modelo: "", placa: "", localizacao: null,
    motivoId: "M-ASSISTENCIA_24H-1", contextoId: "C-ASSISTENCIA_24H-1", descricao: "Pane na rodovia",
  }, "chat");
  await concluirTriagem(apiComo(USUARIOS.atendente), CODIGO, { tipo: "ASSISTENCIA_24H", severidade: 5, urgencia: 5 });
}

describe("conversa do chamado", () => {
  it("mantém o histórico em uma área com rolagem vertical e altura limitada", async () => {
    await chamadoNaFila();
    await registrarAtualizacao(apiComo(USUARIOS.atendente), CODIGO, { texto: "Atualização de teste", visivelCliente: true });
    await renderizarComo(USUARIOS.cliente, <ChamadoDoCliente id={CODIGO} />);

    const conversa = await screen.findByRole("log", { name: "Mensagens do chamado" });
    expect(conversa).toHaveClass("overflow-y-auto", "max-h-96");
  });

  it("a equipe escreve ao fornecedor acionado, e o solicitante não vê a mensagem", async () => {
    const usuario = userEvent.setup();
    await chamadoNaFila();
    await vincularServico(apiComo(USUARIOS.atendente), CODIGO, { fornecedorId: "org-guincho-teste", tipoServico: "Remoção do veículo", local: "", observacao: "" });
    await renderizarComo(USUARIOS.atendente, <DetalhesChamado id={CODIGO} />);
    await usuario.click(await screen.findByRole("radio", { name: "Fornecedor" }));
    await usuario.type(screen.getByLabelText("Escrever mensagem ao fornecedor"), "Qual a previsão de chegada?");
    await usuario.click(screen.getByRole("button", { name: "Enviar ao fornecedor" }));
    const conversa = await screen.findByRole("log", { name: "Mensagens do chamado" });
    expect(await within(conversa).findByText("Qual a previsão de chegada?")).toBeInTheDocument();
    expect(within(conversa).getByText("Fornecedor")).toBeInTheDocument();
    cleanup();
    await renderizarComo(USUARIOS.cliente, <ChamadoDoCliente id={CODIGO} />);
    expect(await screen.findByText("Chamado aberto")).toBeInTheDocument();
    expect(screen.queryByText("Qual a previsão de chegada?")).not.toBeInTheDocument();
  });

  it("sem fornecedor acionado, a aba Fornecedor não aparece", async () => {
    await chamadoNaFila();
    await renderizarComo(USUARIOS.atendente, <DetalhesChamado id={CODIGO} />);
    expect(await screen.findByRole("radio", { name: "Nota interna" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Fornecedor" })).not.toBeInTheDocument();
  });

  it("a equipe envia ao solicitante, e a mensagem aparece no chat e não no histórico", async () => {
    const usuario = userEvent.setup();
    await chamadoNaFila();
    await renderizarComo(USUARIOS.atendente, <DetalhesChamado id={CODIGO} />);

    await usuario.type(await screen.findByLabelText("Escrever mensagem"), "Estamos enviando o guincho");
    await usuario.click(screen.getByRole("button", { name: "Enviar ao solicitante" }));

    const conversa = await screen.findByRole("log", { name: "Mensagens do chamado" });
    expect(await within(conversa).findByText("Estamos enviando o guincho")).toBeInTheDocument();
    expect(within(conversa).getByText("Você")).toBeInTheDocument();
    expect(screen.queryByText("Mensagem ao solicitante")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Escrever mensagem")).toHaveValue(""));
  });

  it("o solicitante vê a mensagem da equipe, mas nunca a nota interna", async () => {
    await chamadoNaFila();
    const equipe = apiComo(USUARIOS.atendente);
    await registrarAtualizacao(equipe, CODIGO, { texto: "Guincho a caminho", visivelCliente: true });
    await registrarAtualizacao(equipe, CODIGO, { texto: "Cliente com contrato corporativo", visivelCliente: false });

    await renderizarComo(USUARIOS.cliente, <ChamadoDoCliente id={CODIGO} />);

    expect(await screen.findByText("Guincho a caminho")).toBeInTheDocument();
    expect(screen.getByText("Ana Atendente · Equipe ViaFlux")).toBeInTheDocument();
    expect(screen.queryByText("Cliente com contrato corporativo")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Nota interna" })).not.toBeInTheDocument();
  });

  it("nota interna tem destaque próprio e só a equipe a enxerga", async () => {
    const usuario = userEvent.setup();
    await chamadoNaFila();
    await renderizarComo(USUARIOS.atendente, <DetalhesChamado id={CODIGO} />);

    await usuario.click(await screen.findByRole("radio", { name: "Nota interna" }));
    expect(screen.getByText("Só a equipe vê esta nota. Ninguém é avisado.")).toBeInTheDocument();
    await usuario.type(screen.getByLabelText("Escrever nota interna"), "Conferir contrato");
    await usuario.click(screen.getByRole("button", { name: "Salvar nota" }));

    const conversa = await screen.findByRole("log", { name: "Mensagens do chamado" });
    expect(await within(conversa).findByText("Conferir contrato")).toBeInTheDocument();
    expect(within(conversa).getByText("Interno")).toBeInTheDocument();
  });

  it("o rascunho de nota interna volta como nota interna depois de recarregar", async () => {
    const usuario = userEvent.setup();
    await chamadoNaFila();
    await renderizarComo(USUARIOS.atendente, <DetalhesChamado id={CODIGO} />);
    await usuario.click(await screen.findByRole("radio", { name: "Nota interna" }));
    await usuario.type(screen.getByLabelText("Escrever nota interna"), "Cliente com pendência");

    cleanup();
    await renderizarComo(USUARIOS.atendente, <DetalhesChamado id={CODIGO} />);

    expect(await screen.findByLabelText("Escrever nota interna")).toHaveValue("Cliente com pendência");
    expect(screen.getByRole("radio", { name: "Nota interna" })).toHaveAttribute("aria-checked", "true");
  });

  it("para a equipe, Enter quebra a linha e o envio exige o botão", async () => {
    const usuario = userEvent.setup();
    await chamadoNaFila();
    await renderizarComo(USUARIOS.atendente, <DetalhesChamado id={CODIGO} />);

    const campo = await screen.findByLabelText("Escrever mensagem");
    await usuario.type(campo, "primeira{Enter}segunda");

    expect(campo).toHaveValue("primeira\nsegunda");
    expect(screen.queryByRole("log", { name: "Mensagens do chamado" })).not.toBeInTheDocument();
  });

  it("enquanto o arquivo é enviado, Enter não duplica a mensagem", async () => {
    const usuario = userEvent.setup();
    await chamadoNaFila();
    const fetchDoBackend = globalThis.fetch;
    let liberarArquivo = () => {};
    const arquivoLiberado = new Promise<void>((resolver) => { liberarArquivo = resolver; });
    let envios = 0;
    vi.stubGlobal("fetch", async (endereco: RequestInfo | URL, init?: RequestInit) => {
      if (String(endereco).endsWith("/atualizacoes")) envios += 1;
      if (String(endereco).endsWith("/mensagens/arquivo")) await arquivoLiberado;
      return fetchDoBackend(endereco, init);
    });
    await renderizarComo(USUARIOS.cliente, <ChamadoDoCliente id={CODIGO} />);

    await usuario.type(await screen.findByLabelText("Escrever mensagem"), "Foto do pneu");
    await usuario.upload(screen.getByLabelText("Selecionar arquivo da mensagem"), new File(["x"], "pneu.png", { type: "image/png" }));
    await usuario.type(screen.getByLabelText("Escrever mensagem"), "{Enter}");
    expect(envios).toBe(0);

    liberarArquivo();
    const conversa = await screen.findByRole("log", { name: "Mensagens do chamado" });
    expect(await within(conversa).findAllByText("Foto do pneu")).toHaveLength(1);
    expect(envios).toBe(0);
  });

  it("Enter envia e Shift+Enter quebra a linha", async () => {
    const usuario = userEvent.setup();
    await chamadoNaFila();
    await renderizarComo(USUARIOS.cliente, <ChamadoDoCliente id={CODIGO} />);

    const campo = await screen.findByLabelText("Escrever mensagem");
    await usuario.type(campo, "primeira{Shift>}{Enter}{/Shift}segunda");
    expect(campo).toHaveValue("primeira\nsegunda");
    await usuario.keyboard("{Enter}");

    const conversa = await screen.findByRole("log", { name: "Mensagens do chamado" });
    expect(await within(conversa).findByText(/primeira\s+segunda/)).toBeInTheDocument();
  });

  it("marca a conversa como lida ao abrir e conclui a notificação da mensagem", async () => {
    await chamadoNaFila();
    await registrarAtualizacao(apiComo(USUARIOS.atendente), CODIGO, { texto: "Precisamos da placa", visivelCliente: true });
    const cliente = apiComo(USUARIOS.cliente);
    const naoLidas = async () => (await cliente.requisitar<{ novoStatus: string; lida: boolean }[]>("/api/notificacoes"))
      .filter((notificacao) => notificacao.novoStatus === "Nova mensagem" && !notificacao.lida);
    expect(await naoLidas()).toHaveLength(1);

    await renderizarComo(USUARIOS.cliente, <ChamadoDoCliente id={CODIGO} />);

    expect(await screen.findByText("Precisamos da placa")).toBeInTheDocument();
    await waitFor(async () => expect(await naoLidas()).toHaveLength(0));
  });

  it("a resposta do solicitante tira o chamado de Aguardando cliente", async () => {
    const usuario = userEvent.setup();
    await chamadoNaFila();
    const equipe = apiComo(USUARIOS.atendente);
    await assumirAtendimento(equipe, CODIGO);
    await alterarStatus(equipe, CODIGO, { status: "Aguardando", motivoAguardando: "CLIENTE" });
    await renderizarComo(USUARIOS.cliente, <ChamadoDoCliente id={CODIGO} />);

    await usuario.type(await screen.findByLabelText("Escrever mensagem"), "A placa é ABC-1D23");
    await usuario.click(screen.getByRole("button", { name: "Enviar" }));

    expect(await screen.findByText("Aguardando → Em atendimento · resposta do solicitante · relógio de resolução retomado")).toBeInTheDocument();
  });

  it("chamado fechado mantém a conversa só para leitura", async () => {
    await chamadoNaFila();
    const equipe = apiComo(USUARIOS.atendente);
    await registrarAtualizacao(equipe, CODIGO, { texto: "Serviço concluído", visivelCliente: true });
    await assumirAtendimento(equipe, CODIGO);
    await alterarStatus(equipe, CODIGO, { status: "Resolvido", resumoResolucao: "Veículo removido" });
    await alterarStatus(equipe, CODIGO, { status: "Fechado" });

    await renderizarComo(USUARIOS.cliente, <ChamadoDoCliente id={CODIGO} />);

    expect(await screen.findByText("Serviço concluído")).toBeInTheDocument();
    expect(screen.getByText("Chamado fechado. Reabra o chamado para continuar a conversa.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Escrever mensagem")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Selecionar anexos")).not.toBeInTheDocument();
  });

  it("recusa anexo fora do formato sem enviar nada", async () => {
    const usuario = userEvent.setup({ applyAccept: false });
    await chamadoNaFila();
    await renderizarComo(USUARIOS.cliente, <ChamadoDoCliente id={CODIGO} />);

    await screen.findByLabelText("Escrever mensagem");
    const arquivo = new File(["x"], "virus.exe", { type: "application/octet-stream" });
    await usuario.upload(screen.getByLabelText("Selecionar arquivo da mensagem"), arquivo);

    expect(screen.queryByText(/Arquivo enviado/)).not.toBeInTheDocument();
    expect(screen.queryByRole("log", { name: "Mensagens do chamado" })).not.toBeInTheDocument();
  });

  it("envia o arquivo junto com a mensagem e oferece o download no balão", async () => {
    const usuario = userEvent.setup();
    await chamadoNaFila();
    await renderizarComo(USUARIOS.cliente, <ChamadoDoCliente id={CODIGO} />);

    await screen.findByLabelText("Escrever mensagem");
    const foto = new File(["conteudo"], "pneu.png", { type: "image/png" });
    await usuario.upload(screen.getByLabelText("Selecionar arquivo da mensagem"), foto);

    const conversa = await screen.findByRole("log", { name: "Mensagens do chamado" });
    expect(await within(conversa).findByText("Arquivo enviado: pneu.png")).toBeInTheDocument();
    expect(within(conversa).getByRole("button", { name: /^Baixar / })).toBeInTheDocument();
  });
});
