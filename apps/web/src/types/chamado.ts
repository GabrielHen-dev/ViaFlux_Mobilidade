export const STATUS_CHAMADO = ["Aberto", "Em triagem", "Em atendimento", "Aguardando", "Resolvido", "Fechado"] as const;
export type Status = (typeof STATUS_CHAMADO)[number];

export const CODIGOS_PRIORIDADE = ["P1", "P2", "P3", "P4"] as const;
export type CodigoPrioridade = (typeof CODIGOS_PRIORIDADE)[number];

export const PESOS = [5, 3, 1] as const;
export type Peso = (typeof PESOS)[number];

export const TIPOS_CHAMADO = ["ASSISTENCIA_24H", "MANUTENCAO", "LOGISTICA", "TI", "FINANCEIRO", "CONTRATOS"] as const;
export type TipoChamado = (typeof TIPOS_CHAMADO)[number];

export const MOTIVOS_AGUARDANDO = ["CLIENTE", "FORNECEDOR", "OUTRO_DEPARTAMENTO"] as const;
export type MotivoAguardando = (typeof MOTIVOS_AGUARDANDO)[number];

export type SituacaoSla = "NO_PRAZO" | "EM_RISCO" | "VIOLADO" | "CUMPRIDO" | "CUMPRIDO_COM_ATRASO";

export interface Departamento {
  codigo: TipoChamado;
  nome: string;
}

export interface Autor {
  id: string | null;
  nome: string;
}

export interface Motivo {
  id: string;
  descricao: string;
  tipo: TipoChamado;
  severidade: Peso;
}

export interface Contexto {
  id: string;
  descricao: string;
  tipo: TipoChamado;
  urgencia: Peso;
}

export interface Classificacao {
  tipo: TipoChamado;
  severidade: Peso;
  urgencia: Peso;
  score: number;
  prioridade: CodigoPrioridade;
}

export interface OverridePrioridade {
  prioridade: CodigoPrioridade;
  justificativa: string;
  autor: Autor;
  definidoEm: string;
}

export interface PrazoSla {
  limite: string;
  cumpridoEm: string | null;
  situacao: SituacaoSla;
}

export interface Sla {
  primeiraResposta: PrazoSla;
  resolucao: PrazoSla;
  pausado: boolean;
  tempoPausadoMinutos: number;
}

export type TipoEvento =
  | "ABERTURA" | "CLASSIFICACAO" | "RECLASSIFICACAO" | "OVERRIDE" | "ROTEAMENTO" | "TRANSFERENCIA"
  | "STATUS" | "ATUALIZACAO" | "ANEXO" | "LOCALIZACAO" | "SLA" | "FORNECEDOR" | "NOTIFICACAO";

export interface EventoTimeline {
  id: string;
  tipo: TipoEvento;
  acao: string;
  detalhe: string;
  ocorridoEm: string;
  autor: Autor | null;
  visivelCliente: boolean;
}

export interface Anexo {
  id: string;
  nome: string;
  tipoConteudo: string;
  tamanho: number;
  enviadoEm: string;
  autor: Autor | null;
}

export interface Localizacao {
  endereco: string;
  latitude: number | null;
  longitude: number | null;
}

export const STATUS_SERVICO = ["SOLICITADO", "RECEBIDO", "EM_EXECUCAO", "CONCLUIDO"] as const;
export type StatusServico = (typeof STATUS_SERVICO)[number];

export interface Solicitante {
  id: string;
  nome: string;
  email: string;
  organizacao: string | null;
}

export interface Fornecedor {
  id: string;
  nome: string;
  especialidade: string;
}

export interface AtualizacaoServico {
  status: StatusServico;
  observacao: string;
  registradoEm: string;
  autor: Autor;
}

export interface ServicoTerceiro {
  id: string;
  chamadoId: string;
  fornecedor: Fornecedor;
  tipoServico: string;
  local: string;
  observacao: string;
  status: StatusServico;
  atualizadoEm: string;
  historico: AtualizacaoServico[];
}

export interface ServicoDoFornecedor {
  id: string;
  chamadoId: string;
  tipoServico: string;
  local: string;
  observacao: string;
  status: StatusServico;
  atualizadoEm: string;
  historico: AtualizacaoServico[];
}

export interface ChamadoResumo {
  id: string;
  cliente: string;
  modelo: string;
  placa: string;
  localizacao: string;
  status: Status;
  prioridade: CodigoPrioridade;
  score: number;
  tipo: TipoChamado;
  departamento: Departamento | null;
  abertura: string;
  atualizadoEm: string;
  sla: Sla | null;
}

export interface Chamado extends ChamadoResumo {
  telefone: string;
  descricao: string;
  motivo: Motivo | null;
  contexto: Contexto | null;
  classificacao: Classificacao;
  override: OverridePrioridade | null;
  motivoAguardando: MotivoAguardando | null;
  localizacaoDetalhada: Localizacao | null;
  timeline: EventoTimeline[];
  anexos: Anexo[];
  servico: ServicoTerceiro | null;
}

export interface PaginaChamados {
  content: ChamadoResumo[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ContadoresSla {
  noPrazo: number;
  emRisco: number;
  violado: number;
}

export interface ResumoChamados {
  total: number;
  porStatus: Record<Status, number>;
  porPrioridade: Record<CodigoPrioridade, number>;
  porDepartamento: Record<TipoChamado, number>;
  sla: { primeiraResposta: ContadoresSla; resolucao: ContadoresSla };
  p1SemPrimeiraResposta: string[];
}

export interface Notificacao {
  id: string;
  chamadoId: string;
  novoStatus: string;
  mensagem: string;
  criadaEm: string;
  lida: boolean;
}

export interface IndicadorMetrica {
  chave: string;
  rotulo: string;
  valor: number | null;
  unidade: "percentual" | "minutos" | "quantidade";
  pendenteDeLevantamento: boolean;
  observacao: string;
}

export interface Metricas {
  periodo: { de: string; ate: string };
  totalChamados: number;
  indicadores: IndicadorMetrica[];
  distribuicaoPorPrioridade: Record<CodigoPrioridade, number>;
}
