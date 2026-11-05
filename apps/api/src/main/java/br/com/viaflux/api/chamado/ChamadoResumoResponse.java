package br.com.viaflux.api.chamado;


import br.com.viaflux.api.chamado.atendimento.AtendimentoResponse;
import br.com.viaflux.api.chamado.classificacao.DepartamentoResponse;
import br.com.viaflux.api.chamado.operacao.EscalonamentoResponse;
import br.com.viaflux.api.chamado.sla.SlaResponse;
import br.com.viaflux.api.chamado.triagem.TriagemResponse;
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
