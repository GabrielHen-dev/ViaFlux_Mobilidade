package br.com.viaflux.api.chamado;

import java.time.Instant;

interface RegraDeRoteamento {

    TipoChamado destino(TipoChamado tipo, Prioridade prioridade, Instant instante);
}
