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
@Table(name = "chamado_evento")
class ChamadoEvento {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chamado_id", nullable = false, updatable = false)
    private Chamado chamado;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoEvento tipo;

    @Column(nullable = false, length = 100)
    private String acao;

    @Column(nullable = false, columnDefinition = "text")
    private String detalhe;

    @Column(name = "autor_id")
    private UUID autorId;

    @Column(name = "autor_nome", length = 150)
    private String autorNome;

    @Column(name = "visivel_cliente", nullable = false)
    private boolean visivelCliente;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VisibilidadeDoConteudo visibilidade = VisibilidadeDoConteudo.INTERNO;

    @Column(name = "ocorrido_em", nullable = false, updatable = false)
    private OffsetDateTime ocorridoEm;

    @Column(name = "sequencia", insertable = false, updatable = false)
    private Long sequencia;

    protected ChamadoEvento() {
    }

    ChamadoEvento(Chamado chamado, TipoEvento tipo, String acao, String detalhe, Autor autor, boolean visivelCliente, OffsetDateTime ocorridoEm) {
        this.id = UUID.randomUUID();
        this.chamado = chamado;
        this.tipo = tipo;
        this.acao = acao;
        this.detalhe = detalhe;
        this.autorId = autor == null ? null : autor.id();
        this.autorNome = autor == null ? null : autor.nome();
        this.visivelCliente = visivelCliente;
        this.visibilidade = visivelCliente ? VisibilidadeDoConteudo.SOLICITANTE : VisibilidadeDoConteudo.INTERNO;
        this.ocorridoEm = ocorridoEm;
    }

    UUID getId() {
        return id;
    }

    Chamado getChamado() {
        return chamado;
    }

    TipoEvento getTipo() {
        return tipo;
    }

    String getAcao() {
        return acao;
    }

    String getDetalhe() {
        return detalhe;
    }

    Autor getAutor() {
        return Autor.de(autorId, autorNome);
    }

    boolean isVisivelCliente() {
        return visivelCliente;
    }

    VisibilidadeDoConteudo getVisibilidade() { return visibilidade; }

    OffsetDateTime getOcorridoEm() {
        return ocorridoEm;
    }
}
