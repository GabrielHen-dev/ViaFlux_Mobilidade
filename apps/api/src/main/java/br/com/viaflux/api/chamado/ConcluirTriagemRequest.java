package br.com.viaflux.api.chamado;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ConcluirTriagemRequest(
        @NotBlank(message = "Selecione o tipo do chamado.")
        String tipo,

        @NotNull(message = "Informe a severidade.")
        Integer severidade,

        @NotNull(message = "Informe a urgência.")
        Integer urgencia,

        String departamento,

        @Size(max = 2000, message = "A observação deve ter no máximo 2000 caracteres.")
        String observacao
) {
}
