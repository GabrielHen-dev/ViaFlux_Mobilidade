package br.com.viaflux.api.chamado.anexo;


import br.com.viaflux.api.chamado.Autor;
import br.com.viaflux.api.chamado.Chamado;
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
@Table(name = "chamado_anexo")
public class ChamadoAnexo{

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chamado_id", nullable = false, updatable = false)
    private Chamado chamado;

    @Column(nullable = false, length = 255)
    private String nome;

    @Column(name = "tipo_conteudo", nullable = false, length = 100)
    private String tipoConteudo;

    @Column(nullable = false)
    private long tamanho;

    @Column(nullable = false, length = 80)
    private String arquivo;

    @Column(name = "enviado_em", nullable = false)
    private OffsetDateTime enviadoEm;

    @Column(name = "autor_id")
    private UUID autorId;

    @Column(name = "autor_nome", length = 150)
    private String autorNome;

    @Column(name = "chave_idempotencia", length = 160)
    private String chaveIdempotencia;

    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VisibilidadeDoConteudo visibilidade;

    protected ChamadoAnexo() {
    }

    public ChamadoAnexo(Chamado chamado, String nome, String tipoConteudo, long tamanho, Autor autor, String chaveIdempotencia, OffsetDateTime enviadoEm, VisibilidadeDoConteudo visibilidade) {
        this.id = UUID.randomUUID();
        this.chamado = chamado;
        this.nome = nome;
        this.tipoConteudo = tipoConteudo;
        this.tamanho = tamanho;
        this.arquivo = id.toString();
        this.autorId = autor.id();
        this.autorNome = autor.nome();
        this.chaveIdempotencia = chaveIdempotencia;
        this.enviadoEm = enviadoEm;
        this.visibilidade = visibilidade;
    }

    public ChamadoAnexo(Chamado chamado, String nome, String tipoConteudo, long tamanho, Autor autor, String chaveIdempotencia, OffsetDateTime enviadoEm) {
        this(chamado, nome, tipoConteudo, tamanho, autor, chaveIdempotencia, enviadoEm, VisibilidadeDoConteudo.INTERNO);
    }

    public UUID getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public String getTipoConteudo() {
        return tipoConteudo;
    }

    public long getTamanho() {
        return tamanho;
    }

    public String getArquivo() {
        return arquivo;
    }

    public OffsetDateTime getEnviadoEm() {
        return enviadoEm;
    }

    public Autor getAutor() {
        return Autor.de(autorId, autorNome);
    }

    public VisibilidadeDoConteudo getVisibilidade() { return visibilidade; }
}
