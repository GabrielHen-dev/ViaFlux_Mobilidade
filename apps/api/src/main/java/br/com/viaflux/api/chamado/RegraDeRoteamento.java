package br.com.viaflux.api.chamado;

import java.time.Instant;

interface RegraDeRoteamento {

    TipoChamado destino(TipoChamado tipo, Prioridade prioridade, Instant instante);

    default TipoChamado destino(TipoChamado tipo, Prioridade prioridade, int urgencia, Instant instante) {
        return destino(tipo, prioridade, instante);
    }
}
