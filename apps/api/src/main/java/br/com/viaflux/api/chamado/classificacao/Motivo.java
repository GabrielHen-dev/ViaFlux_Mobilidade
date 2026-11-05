package br.com.viaflux.api.chamado.classificacao;


import br.com.viaflux.api.chamado.TipoChamado;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "motivo")
public class Motivo{

    @Id
    @Column(length = 40)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TipoChamado tipo;

    @Column(nullable = false, length = 200)
    private String descricao;

    @Column(nullable = false)
    private int severidade;

    @Column(nullable = false)
    private int ordem;

    protected Motivo() {
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

    public int getSeveridade() {
        return severidade;
    }
}
