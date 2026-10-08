package br.com.viaflux.api.chamado;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "chamados")
class Chamado {

    @Id
    private UUID id;

    @Column(nullable = false, length = 150)
    private String solicitante;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusChamado status;

    @Column(name = "aberto_em", nullable = false, updatable = false)
    private OffsetDateTime abertoEm;

    protected Chamado() {
    }

    Chamado(String solicitante, OffsetDateTime abertoEm) {
        this.id = UUID.randomUUID();
        this.solicitante = solicitante;
        this.status = StatusChamado.ABERTO;
        this.abertoEm = abertoEm;
    }

    UUID getId() {
        return id;
    }

    String getSolicitante() {
        return solicitante;
    }

    StatusChamado getStatus() {
        return status;
    }

    OffsetDateTime getAbertoEm() {
        return abertoEm;
    }
}
