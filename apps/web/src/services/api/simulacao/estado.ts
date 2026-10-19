import type {
  Anexo, Classificacao, EventoTimeline, Localizacao, MotivoAguardando, Notificacao, OverridePrioridade, ServicoTerceiro, Status, TipoChamado,
} from "@/types/chamado";
import type { Pausa } from "@/services/api/simulacao/sla";

export interface ExtrasChamado {
  motivoId: string | null;
  contextoId: string | null;
  classificacao: Classificacao | null;
  override: OverridePrioridade | null;
  departamento: TipoChamado | null;
  status: Status | null;
  motivoAguardando: MotivoAguardando | null;
  pausas: Pausa[];
  primeiraRespostaEm: string | null;
  resolvidoEm: string | null;
  eventos: EventoTimeline[];
  anexos: Anexo[];
  localizacao: Localizacao | null;
  solicitanteId: string | null;
  gatilhosSlaRegistrados: string[];
  excluido: boolean;
  removido: boolean;
  marcosImportados?: boolean;
}

export interface NotificacaoSimulada extends Notificacao {
  destinatarioId: string;
}

export interface EstadoSimulado {
  versao: 1;
  chamados: Record<string, ExtrasChamado>;
  chavesIdempotencia: Record<string, string>;
  servicos: Record<string, ServicoTerceiro & { cancelado: boolean }>;
  notificacoes: NotificacaoSimulada[];
}

const CHAVE_ARMAZENAMENTO = "viaflux.simulacao.v1";

let estadoEmMemoria: EstadoSimulado | null = null;

function estadoVazio(): EstadoSimulado {
  return { versao: 1, chamados: {}, chavesIdempotencia: {}, servicos: {}, notificacoes: [] };
}

export function extrasVazios(): ExtrasChamado {
  return {
    motivoId: null, contextoId: null, classificacao: null, override: null, departamento: null, status: null,
    motivoAguardando: null, pausas: [], primeiraRespostaEm: null, resolvidoEm: null, eventos: [], anexos: [],
    localizacao: null, solicitanteId: null, gatilhosSlaRegistrados: [], excluido: false, removido: false,
  };
}

function lerDoNavegador(): EstadoSimulado | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE_ARMAZENAMENTO);
    return bruto ? (JSON.parse(bruto) as EstadoSimulado) : null;
  } catch {
    return null;
  }
}

function gravarNoNavegador(estado: EstadoSimulado) {
  try {
    window.localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(estado));
  } catch {
    estadoEmMemoria = estado;
  }
}

export function carregarEstado(): EstadoSimulado {
  const salvo = typeof window === "undefined" ? null : lerDoNavegador();
  if (salvo?.versao === 1) return salvo;
  return estadoEmMemoria ?? estadoVazio();
}

export function salvarEstado(estado: EstadoSimulado) {
  estadoEmMemoria = estado;
  if (typeof window !== "undefined") gravarNoNavegador(estado);
}

export function alterarEstado<T>(alteracao: (estado: EstadoSimulado) => T): T {
  const estado = carregarEstado();
  const resultado = alteracao(estado);
  salvarEstado(estado);
  return resultado;
}

export function extrasDo(estado: EstadoSimulado, codigo: string) {
  estado.chamados[codigo] ??= extrasVazios();
  return estado.chamados[codigo];
}

export function reiniciarEstadoSimulado() {
  estadoEmMemoria = null;
  if (typeof window !== "undefined") {
    try { window.localStorage.removeItem(CHAVE_ARMAZENAMENTO); } catch { }
  }
}
