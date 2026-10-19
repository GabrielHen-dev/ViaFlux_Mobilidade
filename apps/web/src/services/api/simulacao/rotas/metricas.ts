import type { ContextoSimulado, RotaSimulada } from "@/services/api/simulacao/roteador";
import { CODIGOS_PRIORIDADE, TIPOS_CHAMADO, type ChamadoResumo, type CodigoPrioridade, type IndicadorMetrica, type Metricas, type SituacaoSla, type TipoChamado } from "@/types/chamado";
import { NOME_TIPO } from "@/utils/prioridade";
import { PERFIS_DE_METRICAS, temAlgumPerfil } from "@/utils/perfis";
import { recusar, json } from "@/services/api/simulacao/resposta";
import { alterarEstado, carregarEstado, type EstadoSimulado } from "@/services/api/simulacao/estado";
import { listarTodosOsReais, montarResumo } from "@/services/api/simulacao/montagem";
import { PRAZOS_POR_PRIORIDADE } from "@/services/api/simulacao/sla";

const MINUTO_MS = 60_000;
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

interface LinhaDeMetrica {
  resumo: ChamadoResumo;
  reclassificado: boolean;
  comOverride: boolean;
  classificadoNaAbertura: boolean;
  resolvidoEm: string | null;
  fornecedorId: string | null;
  fornecedorNome: string;
}

function percentual(parte: number, total: number) {
  return total === 0 ? null : Math.round((parte / total) * 1000) / 10;
}

function aderencia(situacoes: SituacaoSla[]) {
  const avaliaveis = situacoes.filter((situacao) => situacao !== "NO_PRAZO" && situacao !== "EM_RISCO");
  return percentual(avaliaveis.filter((situacao) => situacao === "CUMPRIDO").length, avaliaveis.length);
}

function indicador(chave: string, rotulo: string, valor: number | null, unidade: IndicadorMetrica["unidade"], observacao: string): IndicadorMetrica {
  return { chave, rotulo, valor, unidade, pendenteDeLevantamento: false, observacao };
}

function pendente(chave: string, rotulo: string, observacao: string): IndicadorMetrica {
  return { chave, rotulo, valor: null, unidade: "percentual", pendenteDeLevantamento: true, observacao };
}

function lerFiltros(consulta: URLSearchParams) {
  const de = consulta.get("de") ?? "";
  const ate = consulta.get("ate") ?? "";
  if (!DATA_ISO.test(de) || !DATA_ISO.test(ate) || de > ate) recusar(400, "Informe um período válido (data inicial menor ou igual à final).");
  const prioridade = consulta.get("prioridade") as CodigoPrioridade | null;
  const tipo = consulta.get("tipo") as TipoChamado | null;
  const departamento = consulta.get("departamento") as TipoChamado | null;
  if (prioridade && !CODIGOS_PRIORIDADE.includes(prioridade)) recusar(400, "Prioridade inválida.");
  if (tipo && !TIPOS_CHAMADO.includes(tipo)) recusar(400, "Tipo inválido.");
  if (departamento && !TIPOS_CHAMADO.includes(departamento)) recusar(400, "Departamento inválido.");
  return { de, ate, prioridade, tipo, departamento, fornecedor: consulta.get("fornecedor") };
}

function linhaDe(estado: EstadoSimulado, resumo: ChamadoResumo): LinhaDeMetrica {
  const extras = estado.chamados[resumo.id];
  const servico = Object.values(estado.servicos).find((item) => item.chamadoId === resumo.id && !item.cancelado);
  return {
    resumo,
    reclassificado: extras?.eventos.some((evento) => evento.tipo === "RECLASSIFICACAO") ?? false,
    comOverride: extras?.eventos.some((evento) => evento.tipo === "OVERRIDE") ?? false,
    classificadoNaAbertura: Boolean(extras?.motivoId),
    resolvidoEm: extras?.resolvidoEm ?? null,
    fornecedorId: servico?.fornecedor.id ?? null,
    fornecedorNome: servico?.fornecedor.nome ?? "",
  };
}

async function coletar(contexto: ContextoSimulado) {
  if (!contexto.usuario) recusar(401, "Autenticação é necessária para acessar este recurso.");
  if (!temAlgumPerfil(contexto.usuario.perfis, PERFIS_DE_METRICAS)) recusar(403, "As métricas são restritas ao líder operacional e ao administrador.");
  const filtros = lerFiltros(contexto.consulta);
  const reais = await listarTodosOsReais(contexto.realJson, null);
  const agora = new Date();
  const linhas = alterarEstado((estado) =>
    reais
      .filter((item) => !estado.chamados[item.id]?.removido)
      .map((item) => linhaDe(estado, montarResumo(estado, item, agora))),
  ).filter(({ resumo, fornecedorId }) => {
    const dia = resumo.abertura.slice(0, 10);
    if (dia < filtros.de || dia > filtros.ate) return false;
    if (filtros.prioridade && resumo.prioridade !== filtros.prioridade) return false;
    if (filtros.tipo && resumo.tipo !== filtros.tipo) return false;
    if (filtros.departamento && resumo.departamento?.codigo !== filtros.departamento) return false;
    if (filtros.fornecedor && fornecedorId !== filtros.fornecedor) return false;
    return true;
  });
  return { filtros, linhas };
}

function aceiteDosFornecedores(estado: EstadoSimulado, linhas: LinhaDeMetrica[]) {
  const porChamado = new Map(linhas.map((linha) => [linha.resumo.id, linha.resumo.prioridade]));
  const servicos = Object.values(estado.servicos).filter((servico) => !servico.cancelado && porChamado.has(servico.chamadoId));
  const comAtualizacao = servicos.filter((servico) => servico.historico.some((registro) => registro.status !== "SOLICITADO"));
  const aceitosNoPrazo = servicos.filter((servico) => {
    const solicitado = servico.historico[0];
    const recebido = servico.historico.find((registro) => registro.status === "RECEBIDO");
    const prioridade = porChamado.get(servico.chamadoId) ?? "P4";
    if (!solicitado || !recebido) return false;
    const minutos = (new Date(recebido.registradoEm).getTime() - new Date(solicitado.registradoEm).getTime()) / MINUTO_MS;
    return minutos <= PRAZOS_POR_PRIORIDADE[prioridade].primeiraRespostaMin;
  });
  return { total: servicos.length, comAtualizacao: comAtualizacao.length, aceitosNoPrazo: aceitosNoPrazo.length };
}

function calcularMetricas(linhas: LinhaDeMetrica[], de: string, ate: string): Metricas {
  const total = linhas.length;
  const resolvidos = linhas.filter((linha) => linha.resolvidoEm);
  const tempoMedio = resolvidos.length === 0
    ? null
    : Math.round(resolvidos.reduce((soma, linha) => soma + (new Date(linha.resolvidoEm as string).getTime() - new Date(linha.resumo.abertura).getTime()) / MINUTO_MS, 0) / resolvidos.length);
  const reclassificados = linhas.filter((linha) => linha.reclassificado).length;
  const classificados = linhas.filter((linha) => linha.classificadoNaAbertura).length;
  const fornecedores = aceiteDosFornecedores(carregarEstado(), linhas);
  const distribuicao = Object.fromEntries(CODIGOS_PRIORIDADE.map((codigo) => [codigo, linhas.filter((linha) => linha.resumo.prioridade === codigo).length])) as Record<CodigoPrioridade, number>;
  return {
    periodo: { de, ate },
    totalChamados: total,
    distribuicaoPorPrioridade: distribuicao,
    indicadores: [
      indicador("tmr", "Tempo médio de resolução", tempoMedio, "minutos", "Da abertura até o status Resolvido. Fechado não entra no prazo."),
      indicador("aderencia-primeira-resposta", "Aderência ao SLA de 1ª resposta", aderencia(linhas.flatMap((linha) => (linha.resumo.sla ? [linha.resumo.sla.primeiraResposta.situacao] : []))), "percentual", "Prazos já cumpridos ou violados no período."),
      indicador("aderencia-resolucao", "Aderência ao SLA de resolução", aderencia(linhas.flatMap((linha) => (linha.resumo.sla ? [linha.resumo.sla.resolucao.situacao] : []))), "percentual", "Prazos já cumpridos ou violados no período."),
      indicador("rastreabilidade", "Rastreabilidade completa", percentual(classificados, total), "percentual", "Chamados com motivo, contexto, classificação e roteamento registrados desde a abertura."),
      indicador("triagem-correta", "Triagem correta na 1ª tentativa", percentual(classificados - linhas.filter((linha) => linha.classificadoNaAbertura && linha.reclassificado).length, classificados), "percentual", "Chamados classificados na abertura que não precisaram de reclassificação."),
      indicador("taxa-reclassificacao", "Taxa de reclassificação", percentual(reclassificados, total), "percentual", "Chamados com ao menos uma reclassificação na triagem."),
      indicador("taxa-override", "Taxa de override manual", percentual(linhas.filter((linha) => linha.comOverride).length, total), "percentual", "Chamados com prioridade alterada manualmente (RN07)."),
      indicador("atualizacao-fornecedores", "Atualização de status por fornecedores", percentual(fornecedores.comAtualizacao, fornecedores.total), "percentual", "Serviços terceirizados com ao menos uma atualização do próprio fornecedor."),
      indicador("aceite-fornecedores", "Aceite do fornecedor no prazo", percentual(fornecedores.aceitosNoPrazo, fornecedores.total), "percentual", "Status Recebido dentro do prazo de 1ª resposta da prioridade (meta-base proposta)."),
      pendente("csat", "CSAT", "Depende de pesquisa de satisfação ainda não implantada."),
      pendente("repeticao-informacoes", "Repetição de informações por incidente", "Depende de levantamento manual nas planilhas atuais."),
      pendente("adesao-portal", "Adesão ao portal", "Depende do volume de chamados por telefone, WhatsApp e e-mail, que ficam fora da plataforma."),
    ],
  };
}

function celula(valor: string | number) {
  const texto = String(valor);
  return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function paraCsv(linhas: LinhaDeMetrica[]) {
  const cabecalho = ["protocolo", "abertura", "tipo", "departamento", "prioridade", "score", "status", "reclassificado", "override", "sla_primeira_resposta", "sla_resolucao", "minutos_ate_resolucao", "fornecedor"];
  const corpo = linhas.map(({ resumo, reclassificado, comOverride, resolvidoEm, fornecedorNome }) => [
    resumo.id,
    resumo.abertura,
    NOME_TIPO[resumo.tipo],
    resumo.departamento?.nome ?? "",
    resumo.prioridade,
    resumo.score,
    resumo.status,
    reclassificado ? "sim" : "não",
    comOverride ? "sim" : "não",
    resumo.sla?.primeiraResposta.situacao ?? "",
    resumo.sla?.resolucao.situacao ?? "",
    resolvidoEm ? Math.round((new Date(resolvidoEm).getTime() - new Date(resumo.abertura).getTime()) / MINUTO_MS) : "",
    fornecedorNome,
  ].map(celula).join(";"));
  const marcaDeOrdemDeBytes = "\uFEFF";
  return `${marcaDeOrdemDeBytes}${[cabecalho.join(";"), ...corpo].join("\n")}`;
}

export const rotasDeMetricas: RotaSimulada[] = [
  {
    metodo: "GET",
    padrao: "/api/metricas",
    tratar: async (contexto) => {
      const { filtros, linhas } = await coletar(contexto);
      return json(calcularMetricas(linhas, filtros.de, filtros.ate));
    },
  },
  {
    metodo: "GET",
    padrao: "/api/metricas/exportacao",
    tratar: async (contexto) => {
      const { linhas } = await coletar(contexto);
      return new Response(paraCsv(linhas), { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8" } });
    },
  },
];
