import type { ContextoSimulado, RotaSimulada } from "@/services/api/simulacao/roteador";
import type { DadosAtualizacaoServico, DadosVinculoServico } from "@/services/api/contratos";
import type { Fornecedor, ServicoDoFornecedor, StatusServico } from "@/types/chamado";
import { gerarId } from "@/utils/id";
import { PERFIS_DA_CENTRAL, PERFIS_DE_FORNECEDOR, temAlgumPerfil } from "@/utils/perfis";
import { json, recusar, semConteudo } from "@/services/api/simulacao/resposta";
import { alterarEstado, carregarEstado, extrasDo } from "@/services/api/simulacao/estado";
import { type ChamadoReal, montarChamado, notificarSolicitante, novoEvento, servicoPublico } from "@/services/api/simulacao/montagem";

export const FORNECEDORES_CREDENCIADOS: Fornecedor[] = [
  { id: "fornecedor-guincho-viarapido", nome: "Guincho ViaRápido", especialidade: "Guincho / Remoção" },
  { id: "fornecedor-oficina-techtruck", nome: "Oficina TechTruck", especialidade: "Mecânica" },
  { id: "fornecedor-eletricapro", nome: "ElétricaPRO Frotas", especialidade: "Elétrico / Eletrônico" },
  { id: "fornecedor-pneuservice", nome: "PneuService 24h", especialidade: "Borracharia" },
];

export const ROTULO_STATUS_SERVICO: Record<StatusServico, string> = {
  SOLICITADO: "Solicitado",
  RECEBIDO: "Recebido",
  EM_EXECUCAO: "Em execução",
  CONCLUIDO: "Concluído",
};

const STATUS_ATUALIZAVEIS_PELO_FORNECEDOR: DadosAtualizacaoServico["status"][] = ["RECEBIDO", "EM_EXECUCAO", "CONCLUIDO"];

function exigirPerfil(contexto: ContextoSimulado, perfis: readonly string[]) {
  if (!contexto.usuario) recusar(401, "Autenticação é necessária para acessar este recurso.");
  if (!temAlgumPerfil(contexto.usuario.perfis, perfis)) recusar(403, "Você não tem permissão para acessar este recurso.");
}

interface OpcoesAdmin {
  organizacoes: { id: string; nome: string; tipo: "CLIENTE" | "FORNECEDOR" }[];
}

async function fornecedoresDisponiveis(contexto: ContextoSimulado): Promise<Fornecedor[]> {
  const resposta = await contexto.real("/api/admin/usuarios/opcoes").catch(() => null);
  const opcoes = resposta?.ok ? ((await resposta.json()) as OpcoesAdmin) : null;
  const cadastrados = (opcoes?.organizacoes ?? [])
    .filter((organizacao) => organizacao.tipo === "FORNECEDOR")
    .map((organizacao) => ({ id: organizacao.id, nome: organizacao.nome, especialidade: "Fornecedor cadastrado" }));
  const nomesCadastrados = new Set(cadastrados.map((fornecedor) => fornecedor.nome.toLowerCase()));
  return [...cadastrados, ...FORNECEDORES_CREDENCIADOS.filter((fornecedor) => !nomesCadastrados.has(fornecedor.nome.toLowerCase()))];
}

async function organizacaoDoUsuario(contexto: ContextoSimulado) {
  const usuario = await contexto.realJson<{ organizacao: { id: string; tipo: string } | null }>("/auth/me");
  return usuario.organizacao?.tipo === "FORNECEDOR" ? usuario.organizacao.id : null;
}

function paraFornecedor(servico: ReturnType<typeof servicoPublico>): ServicoDoFornecedor {
  return {
    id: servico.id,
    chamadoId: servico.chamadoId,
    tipoServico: servico.tipoServico,
    local: servico.local,
    observacao: servico.observacao,
    status: servico.status,
    atualizadoEm: servico.atualizadoEm,
    historico: servico.historico,
  };
}

async function vincular(contexto: ContextoSimulado) {
  exigirPerfil(contexto, PERFIS_DA_CENTRAL);
  const codigo = contexto.parametros.codigo;
  const dados = contexto.corpo<DadosVinculoServico>();
  const fornecedor = (await fornecedoresDisponiveis(contexto)).find((item) => item.id === dados.fornecedorId);
  const erros: Record<string, string> = {};
  if (!fornecedor) erros.fornecedorId = "Selecione um fornecedor credenciado.";
  if (!dados.tipoServico?.trim()) erros.tipoServico = "Informe o tipo de serviço.";
  if (!fornecedor || Object.keys(erros).length > 0) recusar(400, "Um ou mais campos são inválidos.", erros);
  const real = await contexto.realJson<ChamadoReal>(`/api/chamados/${encodeURIComponent(codigo)}`);
  const autor = await contexto.autor();
  const agora = new Date();
  const corpo = alterarEstado((estado) => {
    if (Object.values(estado.servicos).some((servico) => servico.chamadoId === codigo && !servico.cancelado && servico.status !== "CONCLUIDO")) {
      recusar(409, "O chamado já tem um serviço terceirizado em andamento.");
    }
    const id = gerarId();
    estado.servicos[id] = {
      id,
      chamadoId: codigo,
      fornecedor,
      tipoServico: dados.tipoServico.trim(),
      local: dados.local?.trim() ?? "",
      observacao: dados.observacao?.trim() ?? "",
      status: "SOLICITADO",
      atualizadoEm: agora.toISOString(),
      historico: [{ status: "SOLICITADO", observacao: dados.observacao?.trim() ?? "", registradoEm: agora.toISOString(), autor }],
      cancelado: false,
    };
    extrasDo(estado, codigo).eventos.push(novoEvento("FORNECEDOR", "Serviço terceirizado acionado", `${fornecedor.nome} · ${dados.tipoServico.trim()}`, autor, false, agora));
    return montarChamado(estado, real, agora, false);
  });
  return json(corpo, 201);
}

async function cancelar(contexto: ContextoSimulado) {
  exigirPerfil(contexto, PERFIS_DA_CENTRAL);
  const { codigo, servicoId } = contexto.parametros;
  const autor = await contexto.autor();
  const agora = new Date();
  alterarEstado((estado) => {
    const servico = estado.servicos[servicoId];
    if (!servico || servico.chamadoId !== codigo || servico.cancelado) recusar(404, "Serviço terceirizado não encontrado.");
    servico.cancelado = true;
    extrasDo(estado, codigo).eventos.push(novoEvento("FORNECEDOR", "Serviço terceirizado cancelado", `${servico.fornecedor.nome} · ${servico.tipoServico}`, autor, false, agora));
  });
  return semConteudo();
}

async function listarDoFornecedor(contexto: ContextoSimulado) {
  exigirPerfil(contexto, PERFIS_DE_FORNECEDOR);
  const organizacaoId = await organizacaoDoUsuario(contexto);
  const servicos = Object.values(carregarEstado().servicos)
    .filter((servico) => !servico.cancelado && organizacaoId !== null && servico.fornecedor.id === organizacaoId)
    .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
    .map((servico) => paraFornecedor(servicoPublico(servico)));
  return json(servicos);
}

async function atualizarPeloFornecedor(contexto: ContextoSimulado) {
  exigirPerfil(contexto, PERFIS_DE_FORNECEDOR);
  const dados = contexto.corpo<DadosAtualizacaoServico>();
  if (!STATUS_ATUALIZAVEIS_PELO_FORNECEDOR.includes(dados.status)) {
    recusar(400, "Um ou mais campos são inválidos.", { status: "Use Recebido, Em execução ou Concluído." });
  }
  const organizacaoId = await organizacaoDoUsuario(contexto);
  const autor = await contexto.autor();
  const agora = new Date();
  const servicoAtualizado = alterarEstado((estado) => {
    const servico = estado.servicos[contexto.parametros.id];
    if (!servico || servico.cancelado || servico.fornecedor.id !== organizacaoId) recusar(404, "Serviço não encontrado para este fornecedor.");
    const observacao = dados.observacao?.trim() ?? "";
    servico.status = dados.status;
    servico.atualizadoEm = agora.toISOString();
    servico.historico.push({ status: dados.status, observacao, registradoEm: agora.toISOString(), autor: { id: autor.id, nome: `${autor.nome} · ${servico.fornecedor.nome}` } });
    const rotulo = ROTULO_STATUS_SERVICO[dados.status];
    extrasDo(estado, servico.chamadoId).eventos.push(novoEvento(
      "FORNECEDOR",
      `Fornecedor: ${rotulo}`,
      `${servico.fornecedor.nome}${observacao ? ` · ${observacao}` : ""}`,
      { id: autor.id, nome: servico.fornecedor.nome },
      false,
      agora,
    ));
    notificarSolicitante(estado, servico.chamadoId, `Serviço terceirizado ${rotulo.toLowerCase()}`, `O serviço do chamado ${servico.chamadoId} foi atualizado para ${rotulo}.`, agora);
    return paraFornecedor(servicoPublico(servico));
  });
  return json(servicoAtualizado);
}

export const rotasDeFornecedores: RotaSimulada[] = [
  {
    metodo: "GET",
    padrao: "/api/fornecedores",
    tratar: async (contexto) => {
      exigirPerfil(contexto, PERFIS_DA_CENTRAL);
      return json(await fornecedoresDisponiveis(contexto));
    },
  },
  { metodo: "POST", padrao: "/api/chamados/:codigo/servicos", tratar: vincular },
  { metodo: "DELETE", padrao: "/api/chamados/:codigo/servicos/:servicoId", tratar: cancelar },
  { metodo: "GET", padrao: "/api/fornecedor/servicos", tratar: listarDoFornecedor },
  { metodo: "PATCH", padrao: "/api/fornecedor/servicos/:id/status", tratar: atualizarPeloFornecedor },
];
