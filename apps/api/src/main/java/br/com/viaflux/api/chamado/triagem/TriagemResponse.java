package br.com.viaflux.api.chamado.triagem;


import br.com.viaflux.api.chamado.Autor;
import br.com.viaflux.api.chamado.sla.SituacaoPrazo;

import java.time.OffsetDateTime;

public record TriagemResponse(
        OffsetDateTime limite,
        int prazoMinutos,
        OffsetDateTime iniciadaEm,
        Autor responsavel,
        OffsetDateTime concluidaEm,
        Autor concluidaPor,
        SituacaoPrazo situacao,
        boolean revisaoPendente
) {
}
