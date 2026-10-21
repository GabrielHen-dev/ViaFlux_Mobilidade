package br.com.viaflux.api.chamado;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TransferenciaRequest(
        @NotBlank(message = "Selecione um departamento de destino válido.")
        String departamento,

        @NotBlank(message = "Informe o motivo da transferência.")
        @Size(min = 10, max = 2000, message = "O motivo deve ter entre 10 e 2000 caracteres.")
        String motivo
) {
}
