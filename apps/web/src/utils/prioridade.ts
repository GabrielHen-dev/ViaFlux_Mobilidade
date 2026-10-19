import type { CodigoPrioridade, Peso, TipoChamado } from "@/types/chamado";

export const ROTULO_PRIORIDADE: Record<CodigoPrioridade, string> = {
  P1: "Crítica",
  P2: "Alta",
  P3: "Média",
  P4: "Baixa",
};

export const ROTULO_PESO: Record<Peso, string> = { 5: "Alta", 3: "Média", 1: "Baixa" };

export const NOME_TIPO: Record<TipoChamado, string> = {
  ASSISTENCIA_24H: "Assistência 24h",
  MANUTENCAO: "Manutenção",
  LOGISTICA: "Logística",
  TI: "Tecnologia",
  FINANCEIRO: "Financeiro",
  CONTRATOS: "Contratos",
};

export function prioridadePorScore(score: number): CodigoPrioridade {
  if (score >= 10) return "P1";
  if (score >= 8) return "P2";
  if (score >= 6) return "P3";
  return "P4";
}

export function calcularScore(severidade: Peso, urgencia: Peso) {
  return severidade + urgencia;
}
