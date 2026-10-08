package br.com.viaflux.api.usuario;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "perfil")
public class Perfil {

    public static final String ADMIN = "ADMIN";

    @Id
    private String codigo;

    @Column(nullable = false)
    private String descricao;

    protected Perfil() {
    }

    public String getCodigo() {
        return codigo;
    }

    public String getDescricao() {
        return descricao;
    }
}
