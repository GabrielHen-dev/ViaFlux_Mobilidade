package br.com.viaflux.api.chamado;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReclassificacaoRequest(
        @NotBlank(message = "Selecione o tipo do chamado.")
        String tipo,

        @NotNull(message = "Informe a severidade.")
        Integer severidade,

        @NotNull(message = "Informe a urgência.")
        Integer urgencia,

        @NotBlank(message = "A reclassificação exige justificativa.")
        @Size(min = 10, max = 2000, message = "A justificativa deve ter entre 10 e 2000 caracteres.")
        String justificativa
) {
}
