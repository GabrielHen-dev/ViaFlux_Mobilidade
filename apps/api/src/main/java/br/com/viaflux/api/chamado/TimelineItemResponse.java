package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public record TimelineItemResponse(
        String hora,
        String acao,
        String detalhe,
        String icon,
        OffsetDateTime ocorridoEm
) {

    private static final ZoneId FUSO_HORARIO_VIAFLUX = ZoneId.of("America/Sao_Paulo");
    private static final DateTimeFormatter FORMATO_HORA = DateTimeFormatter.ofPattern("HH:mm");

    static TimelineItemResponse from(ChamadoEvento evento) {
        String horaLocal = evento.getOcorridoEm()
                .atZoneSameInstant(FUSO_HORARIO_VIAFLUX)
                .format(FORMATO_HORA);
        return new TimelineItemResponse(
                horaLocal,
                evento.getAcao(),
                evento.getDetalhe(),
                evento.getIcone(),
                evento.getOcorridoEm()
        );
    }
}
