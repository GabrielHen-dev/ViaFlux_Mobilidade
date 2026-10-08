package br.com.viaflux.api.chamado;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ChamadoResponse(
        UUID id,
        String solicitante,
        StatusChamado status,
        OffsetDateTime abertoEm
) {
    static ChamadoResponse from(Chamado chamado) {
        return new ChamadoResponse(
                chamado.getId(),
                chamado.getSolicitante(),
                chamado.getStatus(),
                chamado.getAbertoEm()
        );
    }
}
