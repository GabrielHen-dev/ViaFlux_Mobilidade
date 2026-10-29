package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;

public record EscalonamentoResponse(OffsetDateTime em, Autor por, String observacao) {

    static EscalonamentoResponse de(Chamado chamado) {
        if (chamado.getEscalonadoEm() == null) {
            return null;
        }
        return new EscalonamentoResponse(Datas.local(chamado.getEscalonadoEm()), chamado.getEscalonadoPor(), chamado.getEscalonamentoMotivo());
    }
}
