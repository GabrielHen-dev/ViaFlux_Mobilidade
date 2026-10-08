import { describe, expect, it } from "vitest";
import { chamadosReducer, type ChamadosState } from "@/store/chamadosReducer";
import { chamadosIniciais } from "@/mocks/chamados";
import { servicoInicial } from "@/mocks/servicos";

const inicial = (): ChamadosState => ({ chamados: structuredClone(chamadosIniciais), lixeira: [], proximoNumero: 1025 });

describe("estado temporário de chamados", () => {
  it("move para a lixeira e restaura o registro completo sem duplicar", () => {
    const state = inicial();
    const removido = chamadosReducer(state, { type: "excluir", id: "VF-1024" });
    expect(removido.chamados).toHaveLength(4);
    expect(removido.lixeira[0]).toEqual(state.chamados[0]);
    const duplicado = chamadosReducer(removido, { type: "excluir", id: "VF-1024" });
    expect(duplicado).toBe(removido);
    const restaurado = chamadosReducer(duplicado, { type: "restaurar", id: "VF-1024" });
    expect(restaurado.chamados).toHaveLength(5);
    expect(restaurado.chamados[0].servicoTerceiro).toEqual(servicoInicial);
    expect(restaurado.chamados[0].timeline).toEqual(state.chamados[0].timeline);
    expect(restaurado.lixeira).toHaveLength(0);
  });
  it("não reutiliza números depois de excluir ou esvaziar a lixeira", () => {
    const state = inicial();
    const criado = chamadosReducer(state, { type: "criar", chamado: { ...state.chamados[0], id: "VF-1025" } });
    const removido = chamadosReducer(criado, { type: "excluir", id: "VF-1025" });
    const vazio = chamadosReducer(removido, { type: "esvaziar" });
    expect(vazio.proximoNumero).toBe(1026);
    const proximo = chamadosReducer(vazio, { type: "criar", chamado: { ...state.chamados[0], id: "VF-1026" } });
    expect(new Set(proximo.chamados.map((c) => c.id)).size).toBe(6);
  });
  it("recusa criar um ID que já está na lixeira", () => {
    const state = inicial();
    const removido = chamadosReducer(state, { type: "excluir", id: "VF-1024" });
    expect(chamadosReducer(removido, { type: "criar", chamado: state.chamados[0] })).toBe(removido);
  });
  it("registra atualização e histórico atomicamente sem alterar outros chamados", () => {
    const state = inicial();
    const atualizado = chamadosReducer(state, { type: "atualizar", chamado: { ...state.chamados[0], status: "Resolvido" },
      evento: { hora: "10:30", acao: "Status atualizado", detalhe: "Resolvido", icon: "atualizacao" },
      historico: { hora: "10:30", acao: "Status atualizado", de: "Em atendimento", para: "Resolvido" },
    });
    expect(atualizado.chamados[0].status).toBe("Resolvido");
    expect(atualizado.chamados[0].timeline).toHaveLength(5);
    expect(atualizado.chamados[0].historico).toHaveLength(1);
    expect(atualizado.chamados[1]).toBe(state.chamados[1]);
    expect(state.chamados[0].status).toBe("Em atendimento");
  });
  it("integra observações do parceiro à timeline do chamado correto", () => {
    const state = inicial();
    const resultado = chamadosReducer(state, { type: "observacaoParceiro", id: "VF-1024", hora: "23:05", texto: "Veículo recolhido" });
    expect(resultado.chamados[0].servicoTerceiro?.atualizacoes[0].texto).toBe("Veículo recolhido");
    expect(resultado.chamados[0].timeline.at(-1)?.detalhe).toBe("Veículo recolhido");
    expect(resultado.chamados[1].timeline).toEqual(state.chamados[1].timeline);
  });
  it("exclusão definitiva remove apenas da lixeira", () => {
    const state = inicial();
    const removido = chamadosReducer(state, { type: "excluir", id: "VF-1024" });
    const resultado = chamadosReducer(removido, { type: "excluirDefinitivo", id: "VF-1024" });
    expect(resultado.lixeira).toHaveLength(0);
    expect(resultado.chamados).toEqual(removido.chamados);
    expect(chamadosReducer(state, { type: "excluirDefinitivo", id: "VF-1024" }).chamados).toHaveLength(5);
  });
});
