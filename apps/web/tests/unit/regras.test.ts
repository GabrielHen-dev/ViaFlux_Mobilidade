import { describe, expect, it } from "vitest";
import { PESOS, type Chamado, type Triagem } from "@/types/chamado";
import { calcularScore, prioridadePorScore } from "@/utils/prioridade";
import { motivoDeRejeicao, LIMITE_ANEXO_BYTES } from "@/utils/anexos";
import { descreverTempoAte } from "@/utils/date";
import { faseDoPrazo } from "@/components/triagem/PrazoDaTriagem";
import { sugestaoDoCliente } from "@/components/triagem/ConclusaoDaTriagem";
import { itensDeMenuPara, type PerfisDoMenu } from "@/components/layout/Sidebar";
import { proximosStatus } from "@/components/fornecedor/AreaDoFornecedor";

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
});

describe("prazo da triagem", () => {
  const triagem = (mudancas: Partial<Triagem> = {}): Triagem => ({
    limite: "2026-10-19T10:20:00-03:00", prazoMinutos: 20, iniciadaEm: null, responsavel: null, concluidaEm: null, concluidaPor: null, situacao: "NO_PRAZO", ...mudancas,
  });

  it("fica verde até a metade do prazo, amarelo depois e vermelho ao estourar", () => {
    expect(faseDoPrazo(triagem(), em("2026-10-19T10:05:00-03:00"))).toBe("NO_PRAZO");
    expect(faseDoPrazo(triagem(), em("2026-10-19T10:10:00-03:00"))).toBe("METADE");
    expect(faseDoPrazo(triagem(), em("2026-10-19T10:20:01-03:00"))).toBe("ESTOURADO");
  });

  it("depois de concluída diz se a triagem cumpriu o prazo", () => {
    expect(faseDoPrazo(triagem({ concluidaEm: "2026-10-19T10:15:00-03:00" }), em("2026-10-19T11:00:00-03:00"))).toBe("CONCLUIDA");
    expect(faseDoPrazo(triagem({ concluidaEm: "2026-10-19T10:25:00-03:00" }), em("2026-10-19T11:00:00-03:00"))).toBe("CONCLUIDA_COM_ATRASO");
  });
});

describe("sugestão da triagem", () => {
  it("parte do motivo e do contexto que o cliente escolheu", () => {
    const chamado = {
      tipo: "MANUTENCAO",
      motivo: { id: "M-MANUTENCAO-3", descricao: "Luz de alerta", tipo: "MANUTENCAO", severidade: 3 },
      contexto: { id: "C-MANUTENCAO-1", descricao: "Sem condições de rodar", tipo: "MANUTENCAO", urgencia: 5 },
    } as Chamado;
    expect(sugestaoDoCliente(chamado)).toEqual({ tipo: "MANUTENCAO", severidade: 3, urgencia: 5 });
  });

  it("não inventa pesos quando o chamado não tem motivo nem contexto", () => {
    expect(sugestaoDoCliente({ tipo: "TI", motivo: null, contexto: null } as Chamado)).toEqual({ tipo: "TI", severidade: null, urgencia: null });
  });
});

describe("menu por perfil", () => {
  const nenhum: PerfisDoMenu = { central: false, triagem: false, abrePelaCentral: false, global: false, metricas: false, cliente: false, fornecedor: false, admin: false };
  const rotulos = (perfis: Partial<PerfisDoMenu>) => itensDeMenuPara({ ...nenhum, ...perfis }).map((item) => item.rotulo);

  it("mostra a fila de triagem só para quem faz triagem", () => {
    expect(rotulos({ central: true, global: true, triagem: true, abrePelaCentral: true })).toEqual(["Dashboard", "Triagem", "Novo Chamado"]);
    expect(rotulos({ central: true, global: true, metricas: true })).toEqual(["Dashboard", "Métricas"]);
    expect(rotulos({ central: true })).toEqual(["Fila do departamento"]);
  });
});

describe("status do serviço terceirizado", () => {
  it("o fornecedor só vê os status que fazem o serviço avançar", () => {
    expect(proximosStatus("SOLICITADO")).toEqual(["RECEBIDO", "EM_EXECUCAO", "CONCLUIDO"]);
    expect(proximosStatus("EM_EXECUCAO")).toEqual(["CONCLUIDO"]);
    expect(proximosStatus("CONCLUIDO")).toEqual([]);
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
