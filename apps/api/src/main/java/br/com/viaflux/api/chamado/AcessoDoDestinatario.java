package br.com.viaflux.api.chamado;

import java.util.UUID;

public interface AcessoDoDestinatario {

    boolean podeVerChamado(UUID usuarioId, UUID chamadoId);
}
