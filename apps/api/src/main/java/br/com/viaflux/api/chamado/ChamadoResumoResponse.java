package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;

public record ChamadoResumoResponse(
        String id,
        String cliente,
        String modelo,
        String placa,
        String localizacao,
        String status,
        Prioridade prioridade,
        Integer score,
        TipoChamado tipo,
        DepartamentoResponse departamento,
        OffsetDateTime abertura,
        OffsetDateTime atualizadoEm,
        SlaResponse sla,
        TriagemResponse triagem,
        AtendimentoResponse atendimento,
        EscalonamentoResponse escalonamento
) {
}
