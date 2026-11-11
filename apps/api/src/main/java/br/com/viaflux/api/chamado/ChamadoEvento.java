package br.com.viaflux.api.chamado;


import br.com.viaflux.api.chamado.anexo.VisibilidadeDoConteudo;
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
public class ChamadoEvento {

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

    @Column(name = "anexo_id")
    private UUID anexoId;

    @Enumerated(EnumType.STRING)
    @Column(name = "origem_mensagem", length = 12)
    private OrigemDaMensagem origemDaMensagem;

    protected ChamadoEvento() {
    }

    public ChamadoEvento(Chamado chamado, TipoEvento tipo, String acao, String detalhe, Autor autor, boolean visivelCliente, OffsetDateTime ocorridoEm) {
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

    public void restringirAoFornecedor() {
        this.visivelCliente = false;
        this.visibilidade = VisibilidadeDoConteudo.FORNECEDOR;
    }

    public void marcarComoMensagem(OrigemDaMensagem origem, UUID anexoId) {
        this.origemDaMensagem = origem;
        this.anexoId = anexoId;
    }

    public OrigemDaMensagem getOrigemDaMensagem() {
        return origemDaMensagem;
    }

    public UUID getAnexoId() {
        return anexoId;
    }

    public UUID getId() {
        return id;
    }

    public Chamado getChamado() {
        return chamado;
    }

    public TipoEvento getTipo() {
        return tipo;
    }

    public String getAcao() {
        return acao;
    }

    public String getDetalhe() {
        return detalhe;
    }

    public Autor getAutor() {
        return Autor.de(autorId, autorNome);
    }

    public boolean isVisivelCliente() {
        return visivelCliente;
    }

    public VisibilidadeDoConteudo getVisibilidade() { return visibilidade; }

    public OffsetDateTime getOcorridoEm() {
        return ocorridoEm;
    }
}
