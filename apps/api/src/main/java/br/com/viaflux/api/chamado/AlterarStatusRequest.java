package br.com.viaflux.api.chamado;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AlterarStatusRequest(
        @NotBlank(message = "Selecione o novo status.")
        String status,

        String motivoAguardando,

        @Size(max = 2000, message = "A observação deve ter no máximo 2000 caracteres.")
        String observacao
) {
}
