package br.com.viaflux.api.chamado.operacao;


import br.com.viaflux.api.chamado.Autor;
import br.com.viaflux.api.chamado.Chamado;
import br.com.viaflux.api.chamado.Datas;
import java.time.OffsetDateTime;

public record EscalonamentoResponse(OffsetDateTime em, Autor por, String observacao) {

    public static EscalonamentoResponse de(Chamado chamado) {
        if (chamado.getEscalonadoEm() == null) {
            return null;
        }
        return new EscalonamentoResponse(Datas.local(chamado.getEscalonadoEm()), chamado.getEscalonadoPor(), chamado.getEscalonamentoMotivo());
    }
}
