import type { Chamado, ServicoTerceiro, TimelineItem, HistoricoItem, Anexo } from "@/types/chamado";

export interface ChamadosState { chamados: Chamado[]; lixeira: Chamado[]; proximoNumero: number; }
export type ChamadosAction =
  | { type: "criar"; chamado: Chamado }
  | { type: "atualizar"; chamado: Chamado; evento?: TimelineItem; historico?: HistoricoItem }
  | { type: "excluir" | "restaurar" | "excluirDefinitivo"; id: string }
  | { type: "esvaziar" }
  | { type: "timeline"; id: string; evento: TimelineItem }
  | { type: "servico"; id: string; servico: ServicoTerceiro | null; evento: TimelineItem }
  | { type: "observacaoParceiro"; id: string; hora: string; texto: string }
  | { type: "anexos"; id: string; anexos: Anexo[] };

// Estado apenas em memória: sem regras oficiais de SLA, transporte HTTP ou persistência.
export function chamadosReducer(state: ChamadosState, action: ChamadosAction): ChamadosState {
  switch (action.type) {
    case "criar":
      if ([...state.chamados, ...state.lixeira].some((c) => c.id === action.chamado.id)) return state;
      return { ...state, chamados: [action.chamado, ...state.chamados], proximoNumero: state.proximoNumero + 1 };
    case "excluir": {
      const alvo = state.chamados.find((c) => c.id === action.id);
      if (!alvo) return state;
      return { ...state, chamados: state.chamados.filter((c) => c.id !== action.id), lixeira: [alvo, ...state.lixeira] };
    }
    case "restaurar": {
      const alvo = state.lixeira.find((c) => c.id === action.id);
      if (!alvo) return state;
      return { ...state, lixeira: state.lixeira.filter((c) => c.id !== action.id), chamados: [alvo, ...state.chamados] };
    }
    case "excluirDefinitivo": return { ...state, lixeira: state.lixeira.filter((c) => c.id !== action.id) };
    case "esvaziar": return { ...state, lixeira: [] };
    case "atualizar": return { ...state, chamados: state.chamados.map((c) => c.id !== action.chamado.id ? c : {
      ...action.chamado,
      timeline: action.evento ? [...c.timeline, action.evento] : c.timeline,
      historico: action.historico ? [...c.historico, action.historico] : c.historico,
      servicoTerceiro: c.servicoTerceiro,
      anexos: c.anexos,
    }) };
    case "timeline": return { ...state, chamados: state.chamados.map((c) => c.id !== action.id ? c : { ...c, timeline: [...c.timeline, action.evento] }) };
    case "servico": return { ...state, chamados: state.chamados.map((c) => c.id !== action.id ? c : {
      ...c, servicoTerceiro: action.servico, timeline: [...c.timeline, action.evento],
    }) };
    case "observacaoParceiro": return { ...state, chamados: state.chamados.map((c) => c.id !== action.id || !c.servicoTerceiro ? c : {
      ...c,
      servicoTerceiro: { ...c.servicoTerceiro, atualizacoes: [{ hora: action.hora, texto: action.texto }, ...c.servicoTerceiro.atualizacoes] },
      timeline: [...c.timeline, { hora: action.hora, acao: "Atualização do parceiro", detalhe: action.texto, icon: "parceiro" }],
    }) };
    case "anexos": return { ...state, chamados: state.chamados.map((c) => c.id !== action.id ? c : { ...c, anexos: [...c.anexos, ...action.anexos] }) };
  }
}
