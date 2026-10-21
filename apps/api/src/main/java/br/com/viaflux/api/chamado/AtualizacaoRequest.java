package br.com.viaflux.api.chamado;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AtualizacaoRequest(
        @NotBlank(message = "Escreva a atualização.")
        @Size(max = 5000, message = "A atualização deve ter no máximo 5000 caracteres.")
        String texto,

        boolean visivelCliente
) {
}
