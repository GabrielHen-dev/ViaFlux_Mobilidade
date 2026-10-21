package br.com.viaflux.api.chamado;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OverrideRequest(
        @NotBlank(message = "Selecione a prioridade.")
        String prioridade,

        @NotBlank(message = "O override de prioridade exige justificativa.")
        @Size(min = 10, max = 2000, message = "A justificativa deve ter entre 10 e 2000 caracteres.")
        String justificativa
) {
}
