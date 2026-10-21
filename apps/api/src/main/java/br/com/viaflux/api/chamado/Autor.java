package br.com.viaflux.api.chamado;

import java.util.UUID;

public record Autor(UUID id, String nome) {

    static final Autor SISTEMA = new Autor(null, "Sistema");

    static Autor de(UUID id, String nome) {
        return nome == null ? null : new Autor(id, nome);
    }
}
