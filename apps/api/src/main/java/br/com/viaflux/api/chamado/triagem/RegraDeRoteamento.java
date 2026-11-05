package br.com.viaflux.api.chamado.triagem;


import br.com.viaflux.api.chamado.Prioridade;
import br.com.viaflux.api.chamado.TipoChamado;
import java.time.Instant;

public interface RegraDeRoteamento{

    public TipoChamado destino(TipoChamado tipo, Prioridade prioridade, Instant instante);

    public default TipoChamado destino(TipoChamado tipo, Prioridade prioridade, int urgencia, Instant instante) {
        return destino(tipo, prioridade, instante);
    }
}
