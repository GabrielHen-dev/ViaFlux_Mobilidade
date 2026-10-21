import type { Contexto, Motivo, Peso, TipoChamado } from "@/types/chamado";

type Linha = [descricao: string, peso: Peso];

const MOTIVOS_POR_TIPO: Record<TipoChamado, Linha[]> = {
  ASSISTENCIA_24H: [
    ["Veículo não liga / Pane elétrica ou mecânica", 5],
    ["Acidente / Colisão / Sinistro com veículo", 5],
    ["Roubo, furto ou tentativa de assalto", 5],
    ["Pneu furado / Roda danificada / Avaria leve", 3],
    ["Chave trancada no interior ou perda de chave", 1],
  ],
  MANUTENCAO: [
    ["Falha no sistema de freios, direção ou suspensão", 5],
    ["Superaquecimento do motor ou vazamento de fluido", 5],
    ["Luz de alerta ou injeção acesa no painel", 3],
    ["Falha no ar-condicionado, vidros ou travas elétricas", 1],
    ["Agendamento de revisão preventiva / Troca de óleo", 1],
  ],
  LOGISTICA: [
    ["Bloqueio ou atraso na entrega de frota corporativa (>1 veículo)", 5],
    ["Falta de veículo disponível na unidade para reserva confirmada", 5],
    ["Solicitação de veículo reserva para substituição", 3],
    ["Divergência no checklist de vistoria (retirada ou devolução)", 3],
    ["Agendamento de transferência de veículo entre unidades", 1],
  ],
  TI: [
    ["Sistema de locação/entrega de veículos fora do ar na unidade", 5],
    ["Queda total de internet ou rede na filial", 5],
    ["Erro ao registrar contrato ou processar pagamento no balcão", 3],
    ["Falha em impressora, leitor ou totem de atendimento", 1],
    ["Solicitação de acesso, reset de senha ou permissão de usuário", 1],
  ],
  FINANCEIRO: [
    ["Cobrança indevida com bloqueio de faturamento/cartão do cliente", 5],
    ["Divergência de valores na fatura de frota corporativa", 3],
    ["Contestação de cobrança de multa, pedágio ou avaria", 3],
    ["Solicitação de 2ª via de boleto ou nota fiscal", 1],
    ["Dúvida simples sobre cobrança, caução ou reembolso", 1],
  ],
  CONTRATOS: [
    ["Bloqueio contratual impedindo retirada imediata de veículo", 5],
    ["Renovação ou prorrogação de contrato prestes a vencer", 3],
    ["Inclusão ou substituição de condutor autorizado no contrato", 3],
    ["Solicitação de aditivo de quilometragem ou alteração de plano", 1],
    ["Dúvida sobre cláusulas contratuais, franquia ou cobertura de seguro", 1],
  ],
};

const CONTEXTOS_POR_TIPO: Record<TipoChamado, Linha[]> = {
  ASSISTENCIA_24H: [
    ["Veículo parado em rodovia, via rápida ou local de risco", 5],
    ["Motorista ou passageiros em trânsito aguardando socorro na rua", 5],
    ["Veículo parado em via urbana comum com trânsito livre", 3],
    ["Veículo estacionado em local seguro (garagem, pátio ou estacionamento)", 1],
    ["Cliente já atendido com transporte alternativo, aguardando apenas remoção", 1],
  ],
  MANUTENCAO: [
    ["Veículo sem condições seguras de rodagem e necessário para operação hoje", 5],
    ["Veículo de frota corporativa sem substituto imediato disponível", 5],
    ["Veículo rodando com limitação, precisando de oficina nas próximas 24h", 3],
    ["Veículo já recolhido no pátio da unidade aguardando vaga na oficina", 1],
    ["Manutenção programada sem impacto imediato na operação", 1],
  ],
  LOGISTICA: [
    ["Cliente ou motorista aguardando presencialmente no balcão da unidade", 5],
    ["Operação de cliente corporativo paralisada aguardando os veículos", 5],
    ["Retirada ou entrega de veículos programada para o mesmo dia", 3],
    ["Movimentação de frota programada para as próximas 24h a 48h", 1],
    ["Ajuste logístico de rotina ou reposição de pátio sem reserva atrelada", 1],
  ],
  TI: [
    ["Unidade totalmente impedida de operar e com fila de clientes no balcão", 5],
    ["Operação 24/7 ou unidade de aeroporto travada sem contingência", 5],
    ["Unidade operando parcialmente com procedimento manual de contingência", 3],
    ["Falha afeta apenas um terminal/usuário, demais postos funcionando", 1],
    ["Solicitação técnica de rotina sem impacto no atendimento ao cliente", 1],
  ],
  FINANCEIRO: [
    ["Cliente impedido de retirar veículo ou operar devido à pendência financeira", 5],
    ["Fatura corporativa com vencimento no dia atual", 5],
    ["Fatura ou pagamento com vencimento nos próximos 3 dias úteis", 3],
    ["Fechamento contábil mensal da empresa cliente em andamento", 3],
    ["Consulta financeira para conferência futura (sem vencimento próximo)", 1],
  ],
  CONTRATOS: [
    ["Motorista no balcão aguardando liberação contratual para sair com o veículo", 5],
    ["Contrato ativo vencendo nas próximas 24 horas com veículo em uso", 5],
    ["Alteração contratual necessária para operação nesta semana", 3],
    ["Adequação cadastral ou documental de rotina", 1],
    ["Simples consulta de termos contratuais para planejamento", 1],
  ],
};

const tipos = Object.keys(MOTIVOS_POR_TIPO) as TipoChamado[];

export const MOTIVOS: Motivo[] = tipos.flatMap((tipo) =>
  MOTIVOS_POR_TIPO[tipo].map(([descricao, severidade], indice) => ({ id: `M-${tipo}-${indice + 1}`, descricao, tipo, severidade })),
);

export const CONTEXTOS: Contexto[] = tipos.flatMap((tipo) =>
  CONTEXTOS_POR_TIPO[tipo].map(([descricao, urgencia], indice) => ({ id: `C-${tipo}-${indice + 1}`, descricao, tipo, urgencia })),
);

export function motivoPorId(id: string | undefined) {
  return MOTIVOS.find((motivo) => motivo.id === id) ?? null;
}

export function contextoPorId(id: string | undefined) {
  return CONTEXTOS.find((contexto) => contexto.id === id) ?? null;
}
