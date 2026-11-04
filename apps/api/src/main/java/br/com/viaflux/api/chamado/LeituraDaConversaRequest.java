package br.com.viaflux.api.chamado;

import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;

public record LeituraDaConversaRequest(
        @NotNull(message = "Informe até quando a conversa foi lida.")
        OffsetDateTime ate
) {
}
