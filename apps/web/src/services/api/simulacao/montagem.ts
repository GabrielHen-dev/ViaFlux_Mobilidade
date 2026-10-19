import type {
  Autor, Chamado, ChamadoResumo, Classificacao, CodigoPrioridade, EventoTimeline, OverridePrioridade, Peso, ServicoTerceiro, Status, TipoChamado, TipoEvento,
} from "@/types/chamado";
import { CODIGOS_PRIORIDADE } from "@/types/chamado";
import { NOME_TIPO, calcularScore, prioridadePorScore } from "@/utils/prioridade";
import { gerarId } from "@/utils/id";
import { type EstadoSimulado, type ExtrasChamado, alterarEstado, carregarEstado, extrasDo } from "@/services/api/simulacao/estado";
import { contextoPorId, motivoPorId } from "@/services/api/simulacao/matriz";
import { calcularSla, estaEmHorarioComercial, gatilhosAtingidos, type GatilhoAtingido } from "@/services/api/simulacao/sla";

export interface EventoReal {
  hora: string;
  acao: string;
  detalhe: string;
  icon: string;
  ocorridoEm: string;
}

export interface ItemReal {
  id: string;
  cliente: string;
  modelo: string;
  placa: string;
  tipo: string;
  localizacao: string;
  status: Status;
  prioridade: string;
  abertura: string;
}

export interface ChamadoReal extends ItemReal {
  telefone: string;
  descricao: string;
  timeline: EventoReal[];
}

export interface PaginaReal {
  content: ItemReal[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const AUTOR_SISTEMA: Autor = { id: null, nome: "Sistema" };

const TIPOS_OPERACIONAIS: TipoChamado[] = ["ASSISTENCIA_24H", "MANUTENCAO", "LOGISTICA"];

const TIPO_POR_ROTULO_LEGADO: Record<string, TipoChamado> = {
  "Mecânico": "MANUTENCAO",
  "Sistema": "TI",
  ...Object.fromEntries(Object.entries(NOME_TIPO).map(([codigo, nome]) => [nome, codigo])),
};

const PESOS_POR_PRIORIDADE_LEGADA: Record<string, [Peso, Peso]> = {
  "Crítica": [5, 5],
  "Alta": [5, 3],
  "Média": [3, 3],
  "Baixa": [3, 1],
};

const ROTULO_DO_PRAZO = { primeiraResposta: "1ª resposta", resolucao: "resolução" } as const;

export function classificar(tipo: TipoChamado, severidade: Peso, urgencia: Peso): Classificacao {
  const score = calcularScore(severidade, urgencia);
  return { tipo, severidade, urgencia, score, prioridade: prioridadePorScore(score) };
}

export function classificacaoVigente(item: ItemReal, extras: ExtrasChamado | undefined): Classificacao {
  if (extras?.classificacao) return extras.classificacao;
  const tipo = TIPO_POR_ROTULO_LEGADO[item.tipo] ?? "ASSISTENCIA_24H";
  const [severidade, urgencia] = PESOS_POR_PRIORIDADE_LEGADA[item.prioridade] ?? [3, 3];
  return classificar(tipo, severidade, urgencia);
}

export function prioridadeEfetiva(classificacao: Classificacao, override: OverridePrioridade | null | undefined): CodigoPrioridade {
  return override?.prioridade ?? classificacao.prioridade;
}

export function rotear(classificacao: Classificacao, instante: Date): TipoChamado {
  const plantao = classificacao.prioridade === "P1" && TIPOS_OPERACIONAIS.includes(classificacao.tipo) && !estaEmHorarioComercial(instante);
  return plantao ? "ASSISTENCIA_24H" : classificacao.tipo;
}

export function novoEvento(tipo: TipoEvento, acao: string, detalhe: string, autor: Autor | null, visivelCliente: boolean, ocorridoEm: Date): EventoTimeline {
  return { id: gerarId(), tipo, acao, detalhe, autor, visivelCliente, ocorridoEm: ocorridoEm.toISOString() };
}

function eventoDoBackend(evento: EventoReal, indice: number, cliente: string): EventoTimeline {
  return {
    id: `backend-${indice}`,
    tipo: indice === 0 ? "ABERTURA" : "ATUALIZACAO",
    acao: evento.acao,
    detalhe: evento.detalhe,
    ocorridoEm: evento.ocorridoEm,
    autor: indice === 0 ? { id: null, nome: cliente } : AUTOR_SISTEMA,
    visivelCliente: true,
  };
}

function textoDoGatilho(gatilho: GatilhoAtingido, prioridade: CodigoPrioridade) {
  const prazo = ROTULO_DO_PRAZO[gatilho.prazo];
  if (gatilho.percentual === 1) {
    const acionamentoDoPlantao = prioridade === "P1" && gatilho.prazo === "primeiraResposta"
      ? " Central de Assistência / Plantão acionado: P1 sem 1ª resposta."
      : "";
    return { acao: `SLA de ${prazo} violado`, detalhe: `100% do prazo consumido. Líder operacional notificado.${acionamentoDoPlantao}` };
  }
  if (gatilho.percentual >= 0.8) {
    return { acao: `Escalonamento do SLA de ${prazo}`, detalhe: "80% do prazo consumido. Líder do departamento e líder operacional alertados." };
  }
  return { acao: `SLA de ${prazo} em risco`, detalhe: "50% do prazo consumido. Responsável pelo chamado notificado." };
}

function registrarGatilhosDeSla(extras: ExtrasChamado, prioridade: CodigoPrioridade, abertura: string, agora: Date) {
  const gatilhos = gatilhosAtingidos({ prioridade, abertura, primeiraRespostaEm: extras.primeiraRespostaEm, resolvidoEm: extras.resolvidoEm, pausas: extras.pausas, agora });
  for (const gatilho of gatilhos) {
    const chave = `${prioridade}:${gatilho.prazo}:${gatilho.percentual}`;
    if (extras.gatilhosSlaRegistrados.includes(chave)) continue;
    extras.gatilhosSlaRegistrados.push(chave);
    const { acao, detalhe } = textoDoGatilho(gatilho, prioridade);
    extras.eventos.push(novoEvento("SLA", acao, detalhe, AUTOR_SISTEMA, false, gatilho.instante));
  }
}

function ultimaAtualizacao(abertura: string, eventos: EventoTimeline[]) {
  return eventos.reduce((maisRecente, evento) => (evento.ocorridoEm > maisRecente ? evento.ocorridoEm : maisRecente), new Date(abertura).toISOString());
}

export function montarResumo(estado: EstadoSimulado, item: ItemReal, agora: Date): ChamadoResumo {
  const extras = extrasDo(estado, item.id);
  const classificacao = classificacaoVigente(item, extras);
  const prioridade = prioridadeEfetiva(classificacao, extras.override);
  const status = extras.status ?? item.status;
  const departamento = extras.departamento ?? classificacao.tipo;
  if (status !== "Fechado") registrarGatilhosDeSla(extras, prioridade, item.abertura, agora);
  return {
    id: item.id,
    cliente: item.cliente,
    modelo: item.modelo,
    placa: item.placa,
    localizacao: extras.localizacao?.endereco || item.localizacao,
    status,
    prioridade,
    score: classificacao.score,
    tipo: classificacao.tipo,
    departamento: { codigo: departamento, nome: NOME_TIPO[departamento] },
    abertura: item.abertura,
    atualizadoEm: ultimaAtualizacao(item.abertura, extras.eventos),
    sla: calcularSla({ prioridade, abertura: item.abertura, primeiraRespostaEm: extras.primeiraRespostaEm, resolvidoEm: extras.resolvidoEm, pausas: extras.pausas, agora }),
  };
}

const STATUS_COM_MARCOS_NO_BACKEND: Status[] = ["Em atendimento", "Aguardando", "Resolvido", "Fechado"];

function aplicarMarcosDoBackend(extras: ExtrasChamado, real: ChamadoReal) {
  const inicioDoAtendimento = real.timeline.find((evento) => evento.icon === "atendimento");
  const resolucao = real.timeline.find((evento) => evento.acao === "Chamado resolvido");
  extras.primeiraRespostaEm ??= inicioDoAtendimento?.ocorridoEm ?? null;
  extras.resolvidoEm ??= resolucao?.ocorridoEm ?? null;
  extras.marcosImportados = true;
}

export async function importarMarcosDoBackend(realJson: <T>(caminho: string) => Promise<T>, reais: ItemReal[]) {
  const estado = carregarEstado();
  const pendentes = reais.filter((item) => STATUS_COM_MARCOS_NO_BACKEND.includes(item.status) && !estado.chamados[item.id]?.marcosImportados);
  if (pendentes.length === 0) return;
  const detalhes = await Promise.all(pendentes.map((item) => realJson<ChamadoReal>(`/api/chamados/${encodeURIComponent(item.id)}`)));
  alterarEstado((atual) => {
    for (const real of detalhes) aplicarMarcosDoBackend(extrasDo(atual, real.id), real);
  });
}

export function montarChamado(estado: EstadoSimulado, real: ChamadoReal, agora: Date, visaoDeCliente: boolean): Chamado {
  const extrasAntesDaMontagem = extrasDo(estado, real.id);
  if (!extrasAntesDaMontagem.marcosImportados) aplicarMarcosDoBackend(extrasAntesDaMontagem, real);
  const resumo = montarResumo(estado, real, agora);
  const extras = extrasDo(estado, real.id);
  const timelineCompleta = [...real.timeline.map((evento, indice) => eventoDoBackend(evento, indice, real.cliente)), ...extras.eventos]
    .sort((a, b) => a.ocorridoEm.localeCompare(b.ocorridoEm));
  const servico = Object.values(estado.servicos)
    .filter((candidato) => candidato.chamadoId === real.id && !candidato.cancelado)
    .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))[0];
  return {
    ...resumo,
    telefone: real.telefone,
    descricao: real.descricao,
    motivo: motivoPorId(extras.motivoId ?? undefined),
    contexto: contextoPorId(extras.contextoId ?? undefined),
    classificacao: classificacaoVigente(real, extras),
    override: extras.override,
    motivoAguardando: extras.motivoAguardando,
    localizacaoDetalhada: extras.localizacao ?? (real.localizacao ? { endereco: real.localizacao, latitude: null, longitude: null } : null),
    timeline: visaoDeCliente ? timelineCompleta.filter((evento) => evento.visivelCliente) : timelineCompleta,
    anexos: extras.anexos,
    servico: servico ? servicoPublico(servico) : null,
  };
}

export function servicoPublico({ cancelado, ...servico }: EstadoSimulado["servicos"][string]): ServicoTerceiro {
  void cancelado;
  return servico;
}

const ORDEM_DA_PRIORIDADE: Record<CodigoPrioridade, number> = Object.fromEntries(CODIGOS_PRIORIDADE.map((codigo, indice) => [codigo, indice])) as Record<CodigoPrioridade, number>;

export function ordenarPelaFila(a: ChamadoResumo, b: ChamadoResumo) {
  return ORDEM_DA_PRIORIDADE[a.prioridade] - ORDEM_DA_PRIORIDADE[b.prioridade] || b.score - a.score || a.abertura.localeCompare(b.abertura);
}

export function ordenarPorMaisRecentes(a: ChamadoResumo, b: ChamadoResumo) {
  return b.abertura.localeCompare(a.abertura) || b.id.localeCompare(a.id);
}

export async function listarTodosOsReais(realJson: <T>(caminho: string) => Promise<T>, busca: string | null) {
  const itens: ItemReal[] = [];
  const tamanhoDaPagina = 100;
  for (let pagina = 0; ; pagina += 1) {
    const parametros = new URLSearchParams({ page: String(pagina), size: String(tamanhoDaPagina) });
    if (busca) parametros.set("busca", busca);
    const resultado = await realJson<PaginaReal>(`/api/chamados?${parametros}`);
    itens.push(...resultado.content);
    if (pagina + 1 >= resultado.totalPages) {
      await importarMarcosDoBackend(realJson, itens);
      return itens;
    }
  }
}

export function notificarSolicitante(estado: EstadoSimulado, codigo: string, novoStatus: string, mensagem: string, agora: Date) {
  const extras = extrasDo(estado, codigo);
  if (!extras.solicitanteId) {
    extras.eventos.push(novoEvento("NOTIFICACAO", "Notificação não enviada", `${novoStatus}: chamado sem solicitante vinculado no portal.`, AUTOR_SISTEMA, false, agora));
    return;
  }
  estado.notificacoes.push({
    id: gerarId(),
    destinatarioId: extras.solicitanteId,
    chamadoId: codigo,
    novoStatus,
    mensagem,
    criadaEm: agora.toISOString(),
    lida: false,
  });
  extras.eventos.push(novoEvento("NOTIFICACAO", "Cliente notificado", `Central de notificações do portal · ${novoStatus}`, AUTOR_SISTEMA, false, agora));
}
