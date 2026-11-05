package br.com.viaflux.api.chamado.sla;


import br.com.viaflux.api.chamado.Datas;
import br.com.viaflux.api.chamado.sla.AvaliacaoDePrazo;
import br.com.viaflux.api.chamado.sla.SituacaoPrazo;

import java.time.OffsetDateTime;

public record PrazoResponse(OffsetDateTime limite, OffsetDateTime cumpridoEm, SituacaoPrazo situacao) {

    public static PrazoResponse de(AvaliacaoDePrazo avaliacao) {
        return new PrazoResponse(Datas.local(avaliacao.limite()), Datas.local(avaliacao.cumpridoEm()), avaliacao.situacao());
    }
}
