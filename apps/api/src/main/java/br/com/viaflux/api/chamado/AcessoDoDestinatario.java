package br.com.viaflux.api.chamado;

import java.util.UUID;

public interface AcessoDoDestinatario {

    public boolean podeVerChamado(UUID usuarioId, UUID chamadoId);
}
