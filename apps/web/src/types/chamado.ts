export type Status = "Aberto" | "Em triagem" | "Em atendimento" | "Aguardando" | "Resolvido" | "Encerrado";
export type Prioridade = "Baixa" | "Média" | "Alta" | "Crítica";
export type StatusServico = "solicitado" | "acionado" | "aceito" | "a_caminho" | "recolhido" | "concluido";

export interface TimelineItem { hora: string; acao: string; detalhe: string; icon: string; }
export interface HistoricoItem { hora: string; acao: string; de: string; para: string; }
export interface EventoTimeline {
  hora: string; titulo: string; detalhe: string; status: StatusServico;
  concluido: boolean; atual?: boolean; proximo?: boolean;
}
export interface Anexo { id: string; nome: string; tamanho: number; tipo: string; }
export interface ServicoTerceiro {
  parceiro: string; telefone: string; tipoServico: string; local: string; observacao: string;
  horaSolicitacao: string; status: StatusServico; eventos: EventoTimeline[];
  atualizacoes: { hora: string; texto: string }[];
}
export interface Chamado {
  id: string; cliente: string; telefone: string; modelo: string; placa: string; tipo: string;
  descricao: string; localizacao: string; status: Status; prioridade: Prioridade;
  setor: string; responsavel: string; abertura: string; sla: string;
  timeline: TimelineItem[]; historico: HistoricoItem[]; servicoTerceiro: ServicoTerceiro | null; anexos: Anexo[];
}
