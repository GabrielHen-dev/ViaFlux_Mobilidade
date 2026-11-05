package br.com.viaflux.api.chamado.servico;


import br.com.viaflux.api.chamado.Autor;
import br.com.viaflux.api.chamado.Datas;
import java.time.OffsetDateTime;

public record AtualizacaoServicoResponse(StatusServico status, String observacao, OffsetDateTime registradoEm, Autor autor) {

    public static AtualizacaoServicoResponse de(ServicoAtualizacao atualizacao) {
        return new AtualizacaoServicoResponse(
                atualizacao.getStatus(), atualizacao.getObservacao(), Datas.local(atualizacao.getRegistradoEm()), atualizacao.getAutor());
    }
}
