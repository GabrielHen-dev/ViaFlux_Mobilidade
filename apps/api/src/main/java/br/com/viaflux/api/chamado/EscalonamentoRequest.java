package br.com.viaflux.api.chamado;

import jakarta.validation.constraints.Size;

public record EscalonamentoRequest(
        @Size(max = 1000, message = "A observação deve ter no máximo 1000 caracteres.")
        String observacao
) {
}
