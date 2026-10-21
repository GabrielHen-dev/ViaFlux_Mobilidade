package br.com.viaflux.api.chamado;

public record ClassificacaoResponse(TipoChamado tipo, int severidade, int urgencia, int score, Prioridade prioridade) {

    static ClassificacaoResponse de(Chamado chamado) {
        if (!chamado.triado()) {
            return null;
        }
        return new ClassificacaoResponse(
                chamado.getClassificacaoTipo(), chamado.getSeveridade(), chamado.getUrgencia(), chamado.score(), chamado.prioridadeCalculada());
    }
}
