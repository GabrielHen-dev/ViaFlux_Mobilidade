import { beforeEach, describe, expect, it } from "vitest";
import { ErroApi, requisitarApi, requisitarArquivo } from "@/services/api/cliente";
import {
  type ClienteApi, abrirChamado, alterarStatus, consultarChamado, definirOverride, enviarAnexo, listarChamados, reclassificarChamado,
  registrarAtualizacao, resumirChamados, transferirChamado,
} from "@/services/api/chamados";
import { atualizarServicoDoFornecedor, consultarMetricas, listarNotificacoes, listarServicosDoFornecedor, vincularServico } from "@/services/api/operacao";
import type { DadosAberturaChamado } from "@/services/api/contratos";
import { type BackendFalso, USUARIOS, type UsuarioDeTeste, tokenDeAcesso } from "../support/backendFalso";
import { ligarBackendFalso } from "../support/renderizar";

const PANE_EM_RODOVIA: DadosAberturaChamado = {
  motivoId: "M-ASSISTENCIA_24H-1",
  contextoId: "C-ASSISTENCIA_24H-1",
  descricao: "Caminhão parou no acostamento e não liga mais.",
  cliente: "Carla Cliente",
  telefone: "(11) 90000-0000",
  modelo: "Volvo FH 460",
  placa: "abc1d23",
  localizacao: { endereco: "BR-116, km 312", latitude: null, longitude: null },
};

const DUVIDA_DE_COBRANCA: DadosAberturaChamado = {
  ...PANE_EM_RODOVIA,
  motivoId: "M-FINANCEIRO-5",
  contextoId: "C-FINANCEIRO-5",
  descricao: "Quero entender a cobrança da caução.",
  modelo: "",
  placa: "",
  localizacao: null,
};

function clienteComo(usuario: UsuarioDeTeste): ClienteApi {
  const comToken = (init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${tokenDeAcesso(usuario)}`);
    return { ...init, headers };
  };
  return {
    requisitar: (caminho, init) => requisitarApi(caminho, comToken(init)),
    baixar: (caminho, init) => requisitarArquivo(caminho, comToken(init)),
  };
}

async function erroDe(promessa: Promise<unknown>) {
  try {
    await promessa;
  } catch (erro) {
    return erro as ErroApi;
  }
  throw new Error("A operação deveria ter falhado.");
}

describe("simulação dos endpoints pendentes sobre o backend atual", () => {
  let backend: BackendFalso;
  const cliente = clienteComo(USUARIOS.cliente);
  const atendente = clienteComo(USUARIOS.atendente);

  beforeEach(() => {
    backend = ligarBackendFalso().backend;
  });

  it("abre o chamado classificando por motivo e contexto (P1, score 10) e roteando ao departamento", async () => {
    const chamado = await abrirChamado(cliente, PANE_EM_RODOVIA, "chave-1");
    expect(chamado.id).toBe("VF-0000");
    expect(chamado.prioridade).toBe("P1");
    expect(chamado.score).toBe(10);
    expect(chamado.departamento?.codigo).toBe("ASSISTENCIA_24H");
    expect(chamado.placa).toBe("ABC1D23");
    expect(backend.chamados[0].tipo).toBe("Assistência 24h");
    expect(chamado.timeline.map((evento) => evento.tipo)).toEqual(["ABERTURA", "ROTEAMENTO"]);
  });

  it("não duplica o chamado quando o reenvio usa a mesma chave de idempotência", async () => {
    const primeiro = await abrirChamado(cliente, PANE_EM_RODOVIA, "mesma-chave");
    const reenvio = await abrirChamado(cliente, PANE_EM_RODOVIA, "mesma-chave");
    expect(reenvio.id).toBe(primeiro.id);
    expect(backend.contagem.aberturas).toBe(1);
  });

  it("preenche o veículo exigido pelo backend atual quando o motivo não envolve veículo", async () => {
    const chamado = await abrirChamado(cliente, DUVIDA_DE_COBRANCA, "chave-financeiro");
    expect(chamado.prioridade).toBe("P4");
    expect(chamado.score).toBe(2);
    expect(backend.chamados[0].modelo).toBe("Não se aplica");
  });

  it("recusa contexto de outro tipo com o campo a corrigir", async () => {
    const erro = await erroDe(abrirChamado(cliente, { ...PANE_EM_RODOVIA, contextoId: "C-TI-1" }, "chave-invalida"));
    expect(erro.status).toBe(400);
    expect(erro.campos.contextoId).toMatch(/não corresponde/);
  });

  it("ordena a fila por prioridade, score e antiguidade e combina filtros", async () => {
    await abrirChamado(cliente, DUVIDA_DE_COBRANCA, "a");
    await abrirChamado(cliente, PANE_EM_RODOVIA, "b");
    const fila = await listarChamados(atendente, { ordenacao: "fila" });
    expect(fila.content.map((chamado) => chamado.prioridade)).toEqual(["P1", "P4"]);
    const soP4 = await listarChamados(atendente, { prioridade: "P4", departamento: "FINANCEIRO" });
    expect(soP4.totalElements).toBe(1);
    const resumo = await resumirChamados(atendente, {});
    expect(resumo.porPrioridade).toMatchObject({ P1: 1, P4: 1 });
    expect(resumo.p1SemPrimeiraResposta).toEqual(["VF-0001"]);
  });

  it("assumir registra a 1ª resposta, notifica o cliente e aparece no histórico público", async () => {
    const { id } = await abrirChamado(cliente, PANE_EM_RODOVIA, "c");
    const assumido = await alterarStatus(atendente, id, { status: "Em atendimento" });
    expect(assumido.status).toBe("Em atendimento");
    expect(assumido.sla?.primeiraResposta.situacao).toBe("CUMPRIDO");
    const notificacoes = await listarNotificacoes(cliente);
    expect(notificacoes[0]).toMatchObject({ chamadoId: id, novoStatus: "Em atendimento", lida: false });
  });

  it("exige motivo no Aguardando e só pausa o SLA quando aguarda o cliente", async () => {
    const { id } = await abrirChamado(cliente, PANE_EM_RODOVIA, "d");
    expect((await erroDe(alterarStatus(atendente, id, { status: "Aguardando" }))).campos.motivoAguardando).toBeTruthy();
    expect((await alterarStatus(atendente, id, { status: "Aguardando", motivoAguardando: "FORNECEDOR" })).sla?.pausado).toBe(false);
    expect((await alterarStatus(atendente, id, { status: "Aguardando", motivoAguardando: "CLIENTE" })).sla?.pausado).toBe(true);
  });

  it("transfere mantendo o histórico, exige motivo e não reinicia o SLA", async () => {
    const { id, sla } = await abrirChamado(cliente, PANE_EM_RODOVIA, "e");
    expect((await erroDe(transferirChamado(atendente, id, { departamento: "MANUTENCAO", motivo: "" }))).status).toBe(400);
    const transferido = await transferirChamado(atendente, id, { departamento: "MANUTENCAO", motivo: "Precisa de oficina, não de guincho" });
    expect(transferido.departamento?.codigo).toBe("MANUTENCAO");
    expect(transferido.sla?.resolucao.limite).toBe(sla?.resolucao.limite);
    expect(transferido.timeline.at(-1)).toMatchObject({ tipo: "TRANSFERENCIA", autor: { nome: "Ana Atendente" }, visivelCliente: false });
  });

  it("reclassifica recalculando o score e mantém o override separado da prioridade calculada", async () => {
    const { id } = await abrirChamado(cliente, PANE_EM_RODOVIA, "f");
    const reclassificado = await reclassificarChamado(atendente, id, { tipo: "ASSISTENCIA_24H", severidade: 3, urgencia: 3, justificativa: "Veículo já está no acostamento seguro" });
    expect(reclassificado.classificacao).toMatchObject({ score: 6, prioridade: "P3" });
    const comOverride = await definirOverride(atendente, id, { prioridade: "P2", justificativa: "Cliente corporativo com contrato especial" });
    expect(comOverride.prioridade).toBe("P2");
    expect(comOverride.classificacao.prioridade).toBe("P3");
    expect((await erroDe(definirOverride(atendente, id, { prioridade: "P1", justificativa: "" }))).status).toBe(400);
  });

  it("mostra ao cliente só os registros públicos", async () => {
    const { id } = await abrirChamado(cliente, PANE_EM_RODOVIA, "g");
    await registrarAtualizacao(atendente, id, { texto: "Anotação interna da Central", visivelCliente: false });
    await registrarAtualizacao(atendente, id, { texto: "Guincho a caminho", visivelCliente: true });
    const visaoDoCliente = await consultarChamado(cliente, id);
    expect(visaoDoCliente.timeline.map((evento) => evento.detalhe)).toContain("Guincho a caminho");
    expect(visaoDoCliente.timeline.map((evento) => evento.detalhe)).not.toContain("Anotação interna da Central");
    expect(visaoDoCliente.timeline.every((evento) => evento.visivelCliente)).toBe(true);
  });

  it("aceita PNG/PDF, rejeita outros formatos e não duplica anexo reenviado", async () => {
    const { id } = await abrirChamado(cliente, PANE_EM_RODOVIA, "h");
    const foto = new File(["png"], "painel.png", { type: "image/png" });
    await enviarAnexo(cliente, id, foto, "anexo-1");
    await enviarAnexo(cliente, id, foto, "anexo-1");
    const rejeitado = await erroDe(enviarAnexo(cliente, id, new File(["x"], "notas.txt", { type: "text/plain" }), "anexo-2"));
    expect(rejeitado.status).toBe(415);
    expect(rejeitado.message).toMatch(/PNG ou JPG/);
    expect((await consultarChamado(atendente, id)).anexos).toHaveLength(1);
  });

  it("o fornecedor vê só os serviços da própria empresa e suas atualizações chegam à Central", async () => {
    const { id } = await abrirChamado(cliente, PANE_EM_RODOVIA, "i");
    const admin = clienteComo(USUARIOS.admin);
    await vincularServico(admin, id, { fornecedorId: "org-guincho-teste", tipoServico: "Remoção do veículo", local: "BR-116", observacao: "" });
    const fornecedor = clienteComo(USUARIOS.fornecedor);
    const [servico] = await listarServicosDoFornecedor(fornecedor);
    expect(servico).not.toHaveProperty("cliente");
    await atualizarServicoDoFornecedor(fornecedor, servico.id, { status: "EM_EXECUCAO", observacao: "Guincho saiu do pátio" });
    const naCentral = await consultarChamado(atendente, id);
    expect(naCentral.servico?.status).toBe("EM_EXECUCAO");
    expect(naCentral.timeline.at(-2)).toMatchObject({ tipo: "FORNECEDOR", detalhe: "Guincho Teste · Guincho saiu do pátio" });
    expect((await erroDe(listarServicosDoFornecedor(atendente))).status).toBe(403);
  });

  it("calcula métricas sem estimar indicadores sem baseline", async () => {
    await abrirChamado(cliente, PANE_EM_RODOVIA, "j");
    const hoje = new Date().toISOString().slice(0, 10);
    const metricas = await consultarMetricas(clienteComo(USUARIOS.lider), { de: "2020-01-01", ate: hoje });
    expect(metricas.totalChamados).toBe(1);
    expect(metricas.indicadores.find((indicador) => indicador.chave === "csat")).toMatchObject({ pendenteDeLevantamento: true, valor: null });
    expect((await erroDe(consultarMetricas(atendente, { de: "2020-01-01", ate: hoje }))).status).toBe(403);
  });

  it("a Central abre em nome do cliente, que vê o chamado e recebe as notificações", async () => {
    const { id } = await abrirChamado(atendente, { ...PANE_EM_RODOVIA, solicitanteId: USUARIOS.cliente.id }, "central-1");
    expect((await listarChamados(cliente, {})).content.map((chamado) => chamado.id)).toEqual([id]);
    expect((await listarChamados(clienteComo(USUARIOS.outroCliente), {})).totalElements).toBe(0);
    await alterarStatus(atendente, id, { status: "Em atendimento" });
    expect((await listarNotificacoes(cliente))[0]).toMatchObject({ chamadoId: id });
    expect((await erroDe(abrirChamado(atendente, PANE_EM_RODOVIA, "central-2"))).campos.solicitanteId).toBe("Informe o cliente solicitante.");
  });

  it("repassa o 403 do backend atual para perfis sem acesso à listagem", async () => {
    const erro = await erroDe(listarChamados(clienteComo(USUARIOS.departamento), {}));
    expect(erro.status).toBe(403);
  });
});
