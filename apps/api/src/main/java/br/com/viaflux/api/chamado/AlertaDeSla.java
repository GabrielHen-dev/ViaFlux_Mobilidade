package br.com.viaflux.api.chamado;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "alerta_sla")
class AlertaDeSla {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chamado_id", nullable = false, updatable = false)
    private Chamado chamado;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private PrazoDeSla prazo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30, updatable = false)
    private LimiarDeSla limiar;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 2, updatable = false)
    private Prioridade prioridade;

    @Column(name = "disparado_em", nullable = false, updatable = false)
    private OffsetDateTime disparadoEm;

    protected AlertaDeSla() {
    }

    AlertaDeSla(Chamado chamado, GatilhoDeSla gatilho, Prioridade prioridade, OffsetDateTime disparadoEm) {
        this.id = UUID.randomUUID();
        this.chamado = chamado;
        this.prazo = gatilho.prazo();
        this.limiar = gatilho.limiar();
        this.prioridade = prioridade;
        this.disparadoEm = disparadoEm;
    }

    GatilhoDeSla gatilho() {
        return new GatilhoDeSla(prazo, limiar);
    }

    Chamado getChamado() {
        return chamado;
    }
}
