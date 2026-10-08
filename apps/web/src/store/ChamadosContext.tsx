"use client";

import { createContext, useContext, useReducer, type ReactNode } from "react";
import { chamadosIniciais } from "@/mocks/chamados";
import type { Anexo, Chamado, HistoricoItem, ServicoTerceiro, TimelineItem } from "@/types/chamado";
import { chamadosReducer, type ChamadosState } from "@/store/chamadosReducer";
import { horaAtual } from "@/utils/date";

interface ChamadosContextValue extends ChamadosState {
  proximoId: string;
  adicionarChamado: (chamado: Chamado) => void;
  atualizarChamado: (chamado: Chamado, evento?: Omit<TimelineItem, "hora">, historico?: HistoricoItem) => void;
  excluirChamado: (id: string) => void;
  restaurarChamado: (id: string) => void;
  excluirDefinitivo: (id: string) => void;
  esvaziarLixeira: () => void;
  registrarAtualizacao: (id: string, evento: Omit<TimelineItem, "hora">) => void;
  vincularServico: (id: string, servico: ServicoTerceiro | null) => void;
  registrarObservacaoParceiro: (id: string, texto: string) => void;
  adicionarAnexos: (id: string, anexos: Anexo[]) => void;
}

const ChamadosContext = createContext<ChamadosContextValue | null>(null);

export function ChamadosProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chamadosReducer, {
    chamados: chamadosIniciais,
    lixeira: [],
    proximoNumero: Math.max(...chamadosIniciais.map((c) => Number(c.id.slice(3)))) + 1,
  });

  const value: ChamadosContextValue = {
    ...state,
    proximoId: `VF-${state.proximoNumero}`,
    adicionarChamado: (chamado) => dispatch({ type: "criar", chamado }),
    atualizarChamado: (chamado, evento, historico) => dispatch({ type: "atualizar", chamado, evento: evento ? { ...evento, hora: horaAtual() } : undefined, historico }),
    excluirChamado: (id) => dispatch({ type: "excluir", id }),
    restaurarChamado: (id) => dispatch({ type: "restaurar", id }),
    excluirDefinitivo: (id) => dispatch({ type: "excluirDefinitivo", id }),
    esvaziarLixeira: () => dispatch({ type: "esvaziar" }),
    registrarAtualizacao: (id, evento) => dispatch({ type: "timeline", id, evento: { ...evento, hora: horaAtual() } }),
    vincularServico: (id, servico) => dispatch({ type: "servico", id, servico, evento: {
      hora: horaAtual(), acao: servico ? "Serviço terceirizado acionado" : "Serviço terceirizado removido",
      detalhe: servico ? `${servico.parceiro} · ${servico.tipoServico}` : "Serviço desvinculado pela Central ViaFlux", icon: "🚛",
    } }),
    registrarObservacaoParceiro: (id, texto) => { if (texto.trim()) dispatch({ type: "observacaoParceiro", id, hora: horaAtual(), texto: texto.trim() }); },
    adicionarAnexos: (id, anexos) => dispatch({ type: "anexos", id, anexos }),
  };
  return <ChamadosContext.Provider value={value}>{children}</ChamadosContext.Provider>;
}

export function useChamados() {
  const context = useContext(ChamadosContext);
  if (!context) throw new Error("useChamados precisa de ChamadosProvider");
  return context;
}
