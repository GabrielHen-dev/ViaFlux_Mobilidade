package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

public record ChamadoResponse(
        String id,
        String cliente,
        String telefone,
        String modelo,
        String placa,
        String tipo,
        String prioridade,
        String descricao,
        String localizacao,
        String status,
        OffsetDateTime abertura,
        List<TimelineItemResponse> timeline
) {
    private static final ZoneId FUSO_HORARIO_VIAFLUX = ZoneId.of("America/Sao_Paulo");

    static ChamadoResponse from(Chamado chamado, List<TimelineItemResponse> timeline) {
        return new ChamadoResponse(
                chamado.getCodigo(),
                chamado.getCliente(),
                chamado.getTelefone(),
                chamado.getModelo(),
                chamado.getPlaca(),
                chamado.getTipo(),
                chamado.getPrioridade(),
                chamado.getDescricao(),
                chamado.getLocalizacao(),
                chamado.getStatus().getRotulo(),
                chamado.getAbertoEm().atZoneSameInstant(FUSO_HORARIO_VIAFLUX).toOffsetDateTime(),
                timeline
        );
    }
}
