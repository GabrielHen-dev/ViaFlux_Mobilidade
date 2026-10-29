package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

public record ResumoDeChamadosResponse(
        long total,
        Map<String, Long> porStatus,
        Map<Prioridade, Long> porPrioridade,
        Map<TipoChamado, Long> porDepartamento,
        Sla sla,
        List<String> p1SemPrimeiraResposta,
        Triagem triagem,
        long escalonados
) {

    public record Contadores(long noPrazo, long emRisco, long violado) {
    }

    public record Sla(Contadores primeiraResposta, Contadores resolucao, Contadores vigente) {
    }

    public record Triagem(long aguardando, long emAndamento, long emRisco, long atrasados, OffsetDateTime proximoLimite, long aguardandoRevisao) {
    }
}
