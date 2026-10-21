import type { CodigoPrioridade, Etapa, Localizacao, MotivoAguardando, Peso, SituacaoSla, Status, StatusServico, TipoChamado } from "@/types/chamado";

export interface DadosAberturaChamado {
  solicitanteId?: string;
  motivoId: string;
  contextoId: string;
  descricao: string;
  cliente: string;
  telefone: string;
  modelo: string;
  placa: string;
  localizacao: Localizacao | null;
}

export type SituacaoSlaFiltravel = Extract<SituacaoSla, "NO_PRAZO" | "EM_RISCO" | "VIOLADO">;

export interface FiltrosChamados {
  busca?: string;
  status?: Status;
  prioridade?: CodigoPrioridade;
  departamento?: TipoChamado;
  sla?: SituacaoSlaFiltravel;
  etapa?: Etapa;
  ordenacao?: "fila" | "recentes";
  page?: number;
  size?: number;
}

export interface DadosConclusaoTriagem {
  tipo: TipoChamado;
  severidade: Peso;
  urgencia: Peso;
  departamento?: TipoChamado | null;
  observacao?: string;
}

export interface DadosReclassificacao {
  tipo: TipoChamado;
  severidade: Peso;
  urgencia: Peso;
  justificativa: string;
}

export interface DadosOverride {
  prioridade: CodigoPrioridade;
  justificativa: string;
}

export interface DadosStatus {
  status: Status;
  motivoAguardando?: MotivoAguardando | null;
  observacao?: string;
}

export interface DadosTransferencia {
  departamento: TipoChamado;
  motivo: string;
}

export interface DadosAtualizacao {
  texto: string;
  visivelCliente: boolean;
}

export interface DadosVinculoServico {
  fornecedorId: string;
  tipoServico: string;
  local: string;
  observacao: string;
}

export interface DadosAtualizacaoServico {
  status: Exclude<StatusServico, "SOLICITADO">;
  observacao: string;
}

export interface FiltrosMetricas {
  de: string;
  ate: string;
  prioridade?: CodigoPrioridade;
  tipo?: TipoChamado;
  departamento?: TipoChamado;
  fornecedor?: string;
}
