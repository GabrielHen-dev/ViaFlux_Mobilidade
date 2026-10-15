package br.com.viaflux.api.usuario;

import jakarta.validation.constraints.NotNull;

public record AlterarAtivoRequest(@NotNull Boolean ativo) {
}
