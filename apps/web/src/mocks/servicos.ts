import type { EventoTimeline, ServicoTerceiro } from "@/types/chamado";

// Cenário demonstrativo original do Figma para VF-1024.
export const timelineServico: EventoTimeline[] = [
  { hora: "22:14", titulo: "Serviço solicitado", detalhe: "Chamado encaminhado para parceiro. Central ViaFlux acionou a fila de guincho.", status: "solicitado", concluido: true },
  { hora: "22:16", titulo: "Parceiro acionado", detalhe: "Guincho ViaRápido foi notificado e recebeu os dados do chamado.", status: "acionado", concluido: true },
  { hora: "22:20", titulo: "Solicitação aceita", detalhe: "Motorista José Augusto aceitou o chamado. Placa do guincho: GHI-4R21.", status: "aceito", concluido: true },
  { hora: "22:31", titulo: "Guincho a caminho", detalhe: "Motorista saiu do pátio. Distância estimada: 18 km. Previsão de chegada: 23:00.", status: "a_caminho", concluido: false, atual: true },
  { hora: "—", titulo: "Veículo recolhido", detalhe: "Aguardando confirmação de recolhimento pelo parceiro.", status: "recolhido", concluido: false, proximo: true },
  { hora: "—", titulo: "Serviço concluído", detalhe: "Veículo entregue no destino e chamado encerrado.", status: "concluido", concluido: false },
];

export const servicoInicial: ServicoTerceiro = {
  parceiro: "Guincho ViaRápido", telefone: "(11) 98000-1234", tipoServico: "Remoção do veículo",
  local: "BR-116, km 312, Guarulhos – SP", observacao: "", horaSolicitacao: "22:14",
  status: "a_caminho", eventos: timelineServico, atualizacoes: [],
};

export function eventosServicoMock(hora: string, parceiro: string): EventoTimeline[] {
  return timelineServico.map((evento, i) => ({
    ...evento, hora: i === 0 ? hora : "—", concluido: false, atual: i === 0, proximo: i === 1,
    detalhe: i === 0 ? `Serviço solicitado a ${parceiro}.` : "Aguardando atualização do parceiro.",
  }));
}

export const parceirosDetalhesMock: Record<string, {
  motorista: string; veiculo: string; avaliacao: string; documento: string;
  modalidade: string; chegada: string; distancia: string;
}> = {
  "Guincho ViaRápido": {
    motorista: "José Augusto", veiculo: "Guincho · GHI-4R21", avaliacao: "4.8 · 1.247 atendimentos",
    documento: "CNPJ 12.345.678/0001-90", modalidade: "Guincho plataforma", chegada: "23:00", distancia: "~18 km · ~29 min",
  },
};

export function prazosServicoMock(servico: ServicoTerceiro) {
  const referencia = parceirosDetalhesMock[servico.parceiro];
  return [
    { label: "Solicitado", valor: servico.horaSolicitacao, cor: "#10B981", icone: "✓" },
    { label: "Aceito pelo parceiro", valor: servico.eventos.find((e) => e.status === "aceito")?.hora ?? "—", cor: "#10B981", icone: "✓" },
    { label: "Previsão de chegada", valor: referencia?.chegada ?? "—", cor: "#2563EB", icone: "→" },
    { label: "Previsão de conclusão", valor: referencia ? "~01:30" : "—", cor: "#94A3B8", icone: "·" },
  ];
}
