package br.com.viaflux.api.chamado;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "contexto")
class Contexto {

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

    String getId() {
        return id;
    }

    TipoChamado getTipo() {
        return tipo;
    }

    String getDescricao() {
        return descricao;
    }

    int getUrgencia() {
        return urgencia;
    }
}
