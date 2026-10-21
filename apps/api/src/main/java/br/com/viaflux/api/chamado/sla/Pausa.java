package br.com.viaflux.api.chamado.sla;

import java.time.Instant;

public record Pausa(Instant inicio, Instant fim) {

    public boolean emAndamento() {
        return fim == null;
    }
}
