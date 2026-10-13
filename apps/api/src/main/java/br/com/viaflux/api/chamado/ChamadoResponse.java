package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;
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
                "Aberto",
                chamado.getAbertoEm(),
                timeline
        );
    }
}
