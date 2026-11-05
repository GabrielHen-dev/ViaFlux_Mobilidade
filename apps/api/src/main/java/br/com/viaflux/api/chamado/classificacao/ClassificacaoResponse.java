package br.com.viaflux.api.chamado.classificacao;


import br.com.viaflux.api.chamado.Chamado;
import br.com.viaflux.api.chamado.Prioridade;
import br.com.viaflux.api.chamado.TipoChamado;
public record ClassificacaoResponse(TipoChamado tipo, int severidade, int urgencia, int score, Prioridade prioridade) {

    public static ClassificacaoResponse de(Chamado chamado) {
        if (!chamado.triado()) {
            return null;
        }
        return new ClassificacaoResponse(
                chamado.getClassificacaoTipo(), chamado.getSeveridade(), chamado.getUrgencia(), chamado.score(), chamado.prioridadeCalculada());
    }
}
