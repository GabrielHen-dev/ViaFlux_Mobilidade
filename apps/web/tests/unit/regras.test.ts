import { describe, expect, it } from "vitest";
import { PESOS } from "@/types/chamado";
import { calcularScore, prioridadePorScore } from "@/utils/prioridade";
import { motivoDeRejeicao, LIMITE_ANEXO_BYTES } from "@/utils/anexos";
import { descreverTempoAte } from "@/utils/date";
import { CONTEXTOS, MOTIVOS } from "@/services/api/simulacao/matriz";
import { calcularSla, estaEmHorarioComercial, gatilhosAtingidos } from "@/services/api/simulacao/sla";

const em = (iso: string) => new Date(iso);

describe("matriz de prioridade (RN06)", () => {
  it.each([
    [5, 5, 10, "P1"], [5, 3, 8, "P2"], [3, 5, 8, "P2"], [5, 1, 6, "P3"], [3, 3, 6, "P3"], [1, 5, 6, "P3"], [3, 1, 4, "P4"], [1, 3, 4, "P4"], [1, 1, 2, "P4"],
  ] as const)("severidade %i + urgência %i = score %i (%s)", (severidade, urgencia, score, prioridade) => {
    expect(calcularScore(severidade, urgencia)).toBe(score);
    expect(prioridadePorScore(score)).toBe(prioridade);
  });

  it("é determinística para todas as combinações de pesos", () => {
    for (const severidade of PESOS) for (const urgencia of PESOS) {
      expect(prioridadePorScore(calcularScore(severidade, urgencia))).toBe(prioridadePorScore(calcularScore(severidade, urgencia)));
    }
  });

  it("tem 5 motivos e 5 contextos para cada um dos 6 tipos", () => {
    expect(MOTIVOS).toHaveLength(30);
    expect(CONTEXTOS).toHaveLength(30);
    expect(new Set(MOTIVOS.map((motivo) => motivo.tipo)).size).toBe(6);
  });
});

describe("SLA", () => {
  it("conta P1 em horas corridas: 15 min para 1ª resposta e 2 h para resolução", () => {
    const sla = calcularSla({ prioridade: "P1", abertura: "2026-10-17T23:00:00-03:00", primeiraRespostaEm: null, resolvidoEm: null, pausas: [], agora: em("2026-10-17T23:05:00-03:00") });
    expect(sla.primeiraResposta.limite).toBe(em("2026-10-17T23:15:00-03:00").toISOString());
    expect(sla.resolucao.limite).toBe(em("2026-10-18T01:00:00-03:00").toISOString());
    expect(sla.primeiraResposta.situacao).toBe("NO_PRAZO");
  });

  it("marca em risco a partir de 50% e violado ao estourar o prazo", () => {
    const base = { prioridade: "P1" as const, abertura: "2026-10-19T10:00:00-03:00", primeiraRespostaEm: null, resolvidoEm: null, pausas: [] };
    expect(calcularSla({ ...base, agora: em("2026-10-19T10:08:00-03:00") }).primeiraResposta.situacao).toBe("EM_RISCO");
    expect(calcularSla({ ...base, agora: em("2026-10-19T10:16:00-03:00") }).primeiraResposta.situacao).toBe("VIOLADO");
  });

  it("conta P3 em horas úteis: aberto sexta às 17h, a 1ª resposta vence segunda às 9h", () => {
    const sla = calcularSla({ prioridade: "P3", abertura: "2026-10-16T17:00:00-03:00", primeiraRespostaEm: null, resolvidoEm: null, pausas: [], agora: em("2026-10-16T17:00:00-03:00") });
    expect(sla.primeiraResposta.limite).toBe(em("2026-10-19T09:00:00-03:00").toISOString());
  });

  it("pausa só o relógio de resolução enquanto aguarda o cliente", () => {
    const sla = calcularSla({
      prioridade: "P2",
      abertura: "2026-10-19T10:00:00-03:00",
      primeiraRespostaEm: "2026-10-19T10:10:00-03:00",
      resolvidoEm: null,
      pausas: [{ inicio: "2026-10-19T11:00:00-03:00", fim: "2026-10-19T12:00:00-03:00" }],
      agora: em("2026-10-19T12:30:00-03:00"),
    });
    expect(sla.resolucao.limite).toBe(em("2026-10-19T15:00:00-03:00").toISOString());
    expect(sla.primeiraResposta.situacao).toBe("CUMPRIDO");
    expect(sla.tempoPausadoMinutos).toBe(60);
  });

  it("dispara os gatilhos de 50%, 80% e 100% uma vez por prazo", () => {
    const gatilhos = gatilhosAtingidos({ prioridade: "P1", abertura: "2026-10-19T10:00:00-03:00", primeiraRespostaEm: null, resolvidoEm: null, pausas: [], agora: em("2026-10-19T10:20:00-03:00") });
    expect(gatilhos.filter((gatilho) => gatilho.prazo === "primeiraResposta").map((gatilho) => gatilho.percentual)).toEqual([0.5, 0.8, 1]);
  });

  it("reconhece o horário comercial de São Paulo", () => {
    expect(estaEmHorarioComercial(em("2026-10-19T09:00:00-03:00"))).toBe(true);
    expect(estaEmHorarioComercial(em("2026-10-19T20:00:00-03:00"))).toBe(false);
    expect(estaEmHorarioComercial(em("2026-10-18T10:00:00-03:00"))).toBe(false);
  });
});

describe("contagem regressiva do SLA", () => {
  it("mostra segundos e indica quando o prazo venceu", () => {
    const agora = em("2026-10-19T10:00:00-03:00");
    expect(descreverTempoAte("2026-10-19T10:14:05-03:00", agora)).toBe("14min 05s restantes");
    expect(descreverTempoAte("2026-10-19T11:30:00-03:00", agora)).toBe("1h 30min 00s restantes");
    expect(descreverTempoAte("2026-10-21T13:05:00-03:00", agora)).toBe("2d 3h 05min restantes");
    expect(descreverTempoAte("2026-10-19T09:58:30-03:00", agora)).toBe("vencido há 1min 30s");
  });
});

describe("anexos", () => {
  it("aceita PNG, JPG e PDF dentro do limite e rejeita o resto com o motivo", () => {
    expect(motivoDeRejeicao({ name: "foto.png", type: "image/png", size: 100 })).toBeNull();
    expect(motivoDeRejeicao({ name: "laudo.pdf", type: "application/pdf", size: 100 })).toBeNull();
    expect(motivoDeRejeicao({ name: "planilha.xlsx", type: "application/vnd.ms-excel", size: 100 })?.motivo).toBe("FORMATO");
    expect(motivoDeRejeicao({ name: "grande.jpg", type: "image/jpeg", size: LIMITE_ANEXO_BYTES + 1 })?.motivo).toBe("TAMANHO");
  });
});
