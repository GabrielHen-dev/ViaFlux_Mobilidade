package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;

public record OverrideResponse(Prioridade prioridade, String justificativa, Autor autor, OffsetDateTime definidoEm) {

    static OverrideResponse de(Chamado chamado) {
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
