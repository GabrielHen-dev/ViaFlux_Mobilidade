package br.com.viaflux.api.chamado;

import br.com.viaflux.api.chamado.sla.Pausa;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.time.OffsetDateTime;

@Embeddable
class PausaDoChamado {

    @Column(name = "inicio", nullable = false)
    private OffsetDateTime inicio;

    @Column(name = "fim")
    private OffsetDateTime fim;

    protected PausaDoChamado() {
    }

    PausaDoChamado(OffsetDateTime inicio) {
        this.inicio = inicio;
    }

    boolean emAndamento() {
        return fim == null;
    }

    void encerrar(OffsetDateTime instante) {
        this.fim = instante;
    }

    Pausa paraPausa() {
        return new Pausa(inicio.toInstant(), fim == null ? null : fim.toInstant());
    }
}
