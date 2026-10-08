package br.com.viaflux.api.chamado;

import java.util.UUID;

public class ChamadoNaoEncontradoException extends RuntimeException {

    public ChamadoNaoEncontradoException(UUID id) {
        super("Chamado não encontrado: " + id);
    }
}
