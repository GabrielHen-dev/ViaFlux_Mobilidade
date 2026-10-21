package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;

public record AtualizacaoServicoResponse(StatusServico status, String observacao, OffsetDateTime registradoEm, Autor autor) {

    static AtualizacaoServicoResponse de(ServicoAtualizacao atualizacao) {
        return new AtualizacaoServicoResponse(
                atualizacao.getStatus(), atualizacao.getObservacao(), Datas.local(atualizacao.getRegistradoEm()), atualizacao.getAutor());
    }
}
