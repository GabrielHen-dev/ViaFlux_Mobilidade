package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;

public record CancelamentoResponse(OffsetDateTime em, Autor por, String motivo) {

    static CancelamentoResponse de(Chamado chamado) {
        if (!chamado.cancelado()) {
            return null;
        }
        return new CancelamentoResponse(Datas.local(chamado.getCanceladoEm()), chamado.getCanceladoPor(), chamado.getCancelamentoMotivo());
    }
}
