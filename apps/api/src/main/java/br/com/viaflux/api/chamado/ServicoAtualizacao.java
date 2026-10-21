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
@Table(name = "servico_atualizacao")
class ServicoAtualizacao {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "servico_id", nullable = false, updatable = false)
    private ServicoTerceiro servico;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusServico status;

    @Column(nullable = false, columnDefinition = "text")
    private String observacao;

    @Column(name = "registrado_em", nullable = false)
    private OffsetDateTime registradoEm;

    @Column(name = "autor_id")
    private UUID autorId;

    @Column(name = "autor_nome", nullable = false, length = 150)
    private String autorNome;

    protected ServicoAtualizacao() {
    }

    ServicoAtualizacao(ServicoTerceiro servico, StatusServico status, String observacao, Autor autor, OffsetDateTime registradoEm) {
        this.id = UUID.randomUUID();
        this.servico = servico;
        this.status = status;
        this.observacao = observacao;
        this.autorId = autor.id();
        this.autorNome = autor.nome();
        this.registradoEm = registradoEm;
    }

    StatusServico getStatus() {
        return status;
    }

    String getObservacao() {
        return observacao;
    }

    OffsetDateTime getRegistradoEm() {
        return registradoEm;
    }

    Autor getAutor() {
        return new Autor(autorId, autorNome);
    }
}
