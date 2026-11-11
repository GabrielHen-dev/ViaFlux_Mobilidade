package br.com.viaflux.api.chamado;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record TransferenciaDeResponsavelRequest(
        @NotNull(message = "Selecione a pessoa que vai assumir o chamado.")
        UUID usuarioId,

        @Size(max = 2000, message = "A observação deve ter no máximo 2000 caracteres.")
        String observacao
) {
}
