package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;
import java.time.ZoneId;

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
    private static final ZoneId FUSO_HORARIO_VIAFLUX = ZoneId.of("America/Sao_Paulo");

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
                chamado.getAbertoEm().atZoneSameInstant(FUSO_HORARIO_VIAFLUX).toOffsetDateTime()
        );
    }
}
