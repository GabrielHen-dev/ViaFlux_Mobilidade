package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;

public record ChamadoListaItemResponse(
        String id,
        String cliente,
        String modelo,
        String placa,
        String tipo,
        String localizacao,
        String status,
        String prioridade,
        OffsetDateTime abertura
) {
    static ChamadoListaItemResponse from(Chamado chamado) {
        return new ChamadoListaItemResponse(
                chamado.getCodigo(),
                chamado.getCliente(),
                chamado.getModelo(),
                chamado.getPlaca(),
                chamado.getTipo(),
                chamado.getLocalizacao(),
                chamado.getStatus().getRotulo(),
                chamado.getPrioridade(),
                chamado.getAbertoEm()
        );
    }
}
