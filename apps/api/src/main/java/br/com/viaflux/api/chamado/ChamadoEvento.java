package br.com.viaflux.api.chamado;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "chamado_evento")
class ChamadoEvento {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chamado_id", nullable = false, updatable = false)
    private Chamado chamado;

    @Column(nullable = false, length = 100)
    private String acao;

    @Column(nullable = false, columnDefinition = "text")
    private String detalhe;

    @Column(nullable = false, length = 30)
    private String icone;

    @Column(name = "ocorrido_em", nullable = false, updatable = false)
    private OffsetDateTime ocorridoEm;

    protected ChamadoEvento() {
    }

    ChamadoEvento(Chamado chamado, String acao, String detalhe, String icone, OffsetDateTime ocorridoEm) {
        this.id = UUID.randomUUID();
        this.chamado = chamado;
        this.acao = acao;
        this.detalhe = detalhe;
        this.icone = icone;
        this.ocorridoEm = ocorridoEm;
    }

    UUID getId() {
        return id;
    }

    Chamado getChamado() {
        return chamado;
    }

    String getAcao() {
        return acao;
    }

    String getDetalhe() {
        return detalhe;
    }

    String getIcone() {
        return icone;
    }

    OffsetDateTime getOcorridoEm() {
        return ocorridoEm;
    }
}
