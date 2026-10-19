import type { CodigoPrioridade, PrazoSla, Sla } from "@/types/chamado";

const MINUTO_MS = 60_000;
const DIA_MS = 24 * 60 * MINUTO_MS;
const DESLOCAMENTO_SAO_PAULO_MS = -3 * 60 * MINUTO_MS;
const ABERTURA_EXPEDIENTE_MIN = 8 * 60;
const FECHAMENTO_EXPEDIENTE_MIN = 18 * 60;
const LIMITE_DIAS_PERCORRIDOS = 800;

export const PERCENTUAL_EM_RISCO = 0.5;
export const PERCENTUAL_ESCALONAMENTO = 0.8;

interface PrazosDaPrioridade {
  primeiraRespostaMin: number;
  resolucaoMin: number;
  contaHorasUteis: boolean;
}

export const PRAZOS_POR_PRIORIDADE: Record<CodigoPrioridade, PrazosDaPrioridade> = {
  P1: { primeiraRespostaMin: 15, resolucaoMin: 2 * 60, contaHorasUteis: false },
  P2: { primeiraRespostaMin: 30, resolucaoMin: 4 * 60, contaHorasUteis: false },
  P3: { primeiraRespostaMin: 2 * 60, resolucaoMin: 24 * 60, contaHorasUteis: true },
  P4: { primeiraRespostaMin: 4 * 60, resolucaoMin: 48 * 60, contaHorasUteis: true },
};

export interface Pausa {
  inicio: string;
  fim: string | null;
}

interface Relogio {
  minutosEntre(inicio: Date, fim: Date): number;
  somarMinutos(inicio: Date, minutos: number): Date;
}

const relogioCorrido: Relogio = {
  minutosEntre: (inicio, fim) => Math.max(0, (fim.getTime() - inicio.getTime()) / MINUTO_MS),
  somarMinutos: (inicio, minutos) => new Date(inicio.getTime() + minutos * MINUTO_MS),
};

function paraHorarioDeSaoPaulo(data: Date) {
  return new Date(data.getTime() + DESLOCAMENTO_SAO_PAULO_MS);
}

function deHorarioDeSaoPaulo(data: Date) {
  return new Date(data.getTime() - DESLOCAMENTO_SAO_PAULO_MS);
}

function inicioDoDia(data: Date) {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
}

function ehDiaUtil(data: Date) {
  const diaDaSemana = data.getUTCDay();
  return diaDaSemana !== 0 && diaDaSemana !== 6;
}

function expedienteDoDia(dia: Date) {
  return {
    abre: new Date(dia.getTime() + ABERTURA_EXPEDIENTE_MIN * MINUTO_MS),
    fecha: new Date(dia.getTime() + FECHAMENTO_EXPEDIENTE_MIN * MINUTO_MS),
  };
}

const relogioDeHorasUteis: Relogio = {
  minutosEntre(inicio, fim) {
    if (fim <= inicio) return 0;
    const inicioLocal = paraHorarioDeSaoPaulo(inicio);
    const fimLocal = paraHorarioDeSaoPaulo(fim);
    let dia = inicioDoDia(inicioLocal);
    let total = 0;
    for (let passo = 0; dia < fimLocal && passo < LIMITE_DIAS_PERCORRIDOS; passo += 1) {
      if (ehDiaUtil(dia)) {
        const { abre, fecha } = expedienteDoDia(dia);
        const trechoInicio = Math.max(abre.getTime(), inicioLocal.getTime());
        const trechoFim = Math.min(fecha.getTime(), fimLocal.getTime());
        if (trechoFim > trechoInicio) total += (trechoFim - trechoInicio) / MINUTO_MS;
      }
      dia = new Date(dia.getTime() + DIA_MS);
    }
    return total;
  },
  somarMinutos(inicio, minutos) {
    let restante = minutos;
    let cursor = paraHorarioDeSaoPaulo(inicio);
    for (let passo = 0; passo < LIMITE_DIAS_PERCORRIDOS; passo += 1) {
      const dia = inicioDoDia(cursor);
      if (ehDiaUtil(dia)) {
        const { abre, fecha } = expedienteDoDia(dia);
        const partida = Math.max(abre.getTime(), cursor.getTime());
        const disponivel = (fecha.getTime() - partida) / MINUTO_MS;
        if (disponivel > 0) {
          if (restante <= disponivel) return deHorarioDeSaoPaulo(new Date(partida + restante * MINUTO_MS));
          restante -= disponivel;
        }
      }
      cursor = new Date(dia.getTime() + DIA_MS);
    }
    return deHorarioDeSaoPaulo(cursor);
  },
};

function relogioDa(prioridade: CodigoPrioridade) {
  return PRAZOS_POR_PRIORIDADE[prioridade].contaHorasUteis ? relogioDeHorasUteis : relogioCorrido;
}

export function estaEmHorarioComercial(data: Date) {
  const local = paraHorarioDeSaoPaulo(data);
  const minutoDoDia = local.getUTCHours() * 60 + local.getUTCMinutes();
  return ehDiaUtil(local) && minutoDoDia >= ABERTURA_EXPEDIENTE_MIN && minutoDoDia < FECHAMENTO_EXPEDIENTE_MIN;
}

function minutosPausados(relogio: Relogio, pausas: Pausa[], agora: Date) {
  return pausas.reduce((total, pausa) => total + relogio.minutosEntre(new Date(pausa.inicio), pausa.fim ? new Date(pausa.fim) : agora), 0);
}

interface DadosDoPrazo {
  relogio: Relogio;
  abertura: Date;
  duracaoMin: number;
  pausadoMin: number;
  cumpridoEm: string | null;
  agora: Date;
}

function avaliarPrazo({ relogio, abertura, duracaoMin, pausadoMin, cumpridoEm, agora }: DadosDoPrazo): PrazoSla {
  const limite = relogio.somarMinutos(abertura, duracaoMin + pausadoMin);
  if (cumpridoEm) {
    return { limite: limite.toISOString(), cumpridoEm, situacao: new Date(cumpridoEm) <= limite ? "CUMPRIDO" : "CUMPRIDO_COM_ATRASO" };
  }
  const consumido = (relogio.minutosEntre(abertura, agora) - pausadoMin) / duracaoMin;
  const situacao = consumido >= 1 ? "VIOLADO" : consumido >= PERCENTUAL_EM_RISCO ? "EM_RISCO" : "NO_PRAZO";
  return { limite: limite.toISOString(), cumpridoEm: null, situacao };
}

export interface EntradaSla {
  prioridade: CodigoPrioridade;
  abertura: string;
  primeiraRespostaEm: string | null;
  resolvidoEm: string | null;
  pausas: Pausa[];
  agora: Date;
}

export function calcularSla({ prioridade, abertura, primeiraRespostaEm, resolvidoEm, pausas, agora }: EntradaSla): Sla {
  const prazos = PRAZOS_POR_PRIORIDADE[prioridade];
  const relogio = relogioDa(prioridade);
  const inicio = new Date(abertura);
  const pausadoMin = minutosPausados(relogio, pausas, resolvidoEm ? new Date(resolvidoEm) : agora);
  return {
    primeiraResposta: avaliarPrazo({ relogio, abertura: inicio, duracaoMin: prazos.primeiraRespostaMin, pausadoMin: 0, cumpridoEm: primeiraRespostaEm, agora }),
    resolucao: avaliarPrazo({ relogio, abertura: inicio, duracaoMin: prazos.resolucaoMin, pausadoMin, cumpridoEm: resolvidoEm, agora }),
    pausado: pausas.some((pausa) => pausa.fim === null),
    tempoPausadoMinutos: Math.round(minutosPausados(relogioCorrido, pausas, agora)),
  };
}

export const GATILHOS_DE_ESCALONAMENTO = [PERCENTUAL_EM_RISCO, PERCENTUAL_ESCALONAMENTO, 1] as const;

export type PrazoMonitorado = "primeiraResposta" | "resolucao";

export interface GatilhoAtingido {
  prazo: PrazoMonitorado;
  percentual: (typeof GATILHOS_DE_ESCALONAMENTO)[number];
  instante: Date;
}

export function gatilhosAtingidos({ prioridade, abertura, primeiraRespostaEm, resolvidoEm, pausas, agora }: EntradaSla): GatilhoAtingido[] {
  const prazos = PRAZOS_POR_PRIORIDADE[prioridade];
  const relogio = relogioDa(prioridade);
  const inicio = new Date(abertura);
  const monitorados: { prazo: PrazoMonitorado; duracaoMin: number; cumpridoEm: string | null; consideraPausas: boolean }[] = [
    { prazo: "primeiraResposta", duracaoMin: prazos.primeiraRespostaMin, cumpridoEm: primeiraRespostaEm, consideraPausas: false },
    { prazo: "resolucao", duracaoMin: prazos.resolucaoMin, cumpridoEm: resolvidoEm, consideraPausas: true },
  ];
  return monitorados.flatMap(({ prazo, duracaoMin, cumpridoEm, consideraPausas }) => {
    const referencia = cumpridoEm ? new Date(cumpridoEm) : agora;
    const pausadoMin = consideraPausas ? minutosPausados(relogio, pausas, referencia) : 0;
    return GATILHOS_DE_ESCALONAMENTO
      .map((percentual) => ({ prazo, percentual, instante: relogio.somarMinutos(inicio, duracaoMin * percentual + pausadoMin) }))
      .filter((gatilho) => gatilho.instante <= referencia);
  });
}
