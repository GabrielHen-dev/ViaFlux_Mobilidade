package br.com.viaflux.api.chamado;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AbrirChamadoRequest(
        @NotBlank(message = "O solicitante é obrigatório.")
        @Size(max = 150, message = "O solicitante deve ter no máximo 150 caracteres.")
        String solicitante
) {
}
