package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;

public record AtendimentoResponse(Autor responsavel, OffsetDateTime assumidoEm) {

    static AtendimentoResponse de(Chamado chamado) {
        Autor responsavel = chamado.getAtendimentoResponsavel();
        return responsavel == null ? null : new AtendimentoResponse(responsavel, Datas.local(chamado.getAtendimentoAssumidoEm()));
    }
}
