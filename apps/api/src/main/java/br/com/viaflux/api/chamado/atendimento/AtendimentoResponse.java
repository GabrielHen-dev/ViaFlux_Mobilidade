package br.com.viaflux.api.chamado.atendimento;


import br.com.viaflux.api.chamado.Autor;
import br.com.viaflux.api.chamado.Chamado;
import br.com.viaflux.api.chamado.Datas;
import java.time.OffsetDateTime;

public record AtendimentoResponse(Autor responsavel, OffsetDateTime assumidoEm) {

    public static AtendimentoResponse de(Chamado chamado) {
        Autor responsavel = chamado.getAtendimentoResponsavel();
        return responsavel == null ? null : new AtendimentoResponse(responsavel, Datas.local(chamado.getAtendimentoAssumidoEm()));
    }
}
