package br.com.viaflux.api.usuario;

import java.util.UUID;

public record ConviteSolicitado(UUID usuarioId, UUID convidanteId) {
}
