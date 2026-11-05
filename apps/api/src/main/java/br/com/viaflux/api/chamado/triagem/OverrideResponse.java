package br.com.viaflux.api.chamado.triagem;


import br.com.viaflux.api.chamado.Autor;
import br.com.viaflux.api.chamado.Chamado;
import br.com.viaflux.api.chamado.Datas;
import br.com.viaflux.api.chamado.Prioridade;
import java.time.OffsetDateTime;

public record OverrideResponse(Prioridade prioridade, String justificativa, Autor autor, OffsetDateTime definidoEm) {

    public static OverrideResponse de(Chamado chamado) {
        if (chamado.getOverridePrioridade() == null) {
            return null;
        }
        return new OverrideResponse(
                chamado.getOverridePrioridade(),
                chamado.getOverrideJustificativa(),
                chamado.getOverrideAutor(),
                Datas.local(chamado.getOverrideDefinidoEm())
        );
    }
}
