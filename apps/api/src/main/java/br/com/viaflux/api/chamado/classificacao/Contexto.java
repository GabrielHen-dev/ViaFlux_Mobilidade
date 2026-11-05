package br.com.viaflux.api.chamado.classificacao;


import br.com.viaflux.api.chamado.TipoChamado;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "contexto")
public class Contexto{

    @Id
    @Column(length = 40)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TipoChamado tipo;

    @Column(nullable = false, length = 200)
    private String descricao;

    @Column(nullable = false)
    private int urgencia;

    @Column(nullable = false)
    private int ordem;

    protected Contexto() {
    }

    public String getId() {
        return id;
    }

    public TipoChamado getTipo() {
        return tipo;
    }

    public String getDescricao() {
        return descricao;
    }

    public int getUrgencia() {
        return urgencia;
    }
}
