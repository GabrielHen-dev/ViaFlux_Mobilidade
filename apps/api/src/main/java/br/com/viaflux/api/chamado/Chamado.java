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
import br.com.viaflux.api.usuario.Usuario;

import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name = "chamados")
class Chamado {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 20)
    private String codigo;

    @Column(nullable = false, length = 150)
    private String cliente;

    @Column(length = 30)
    private String telefone;

    @Column(nullable = false, length = 120)
    private String modelo;

    @Column(length = 20)
    private String placa;

    @Column(nullable = false, length = 80)
    private String tipo;

    @Column(nullable = false, length = 20)
    private String prioridade;

    @Column(columnDefinition = "text")
    private String descricao;

    @Column(length = 255)
    private String localizacao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusChamado status;

    @Column(name = "aberto_em", nullable = false, updatable = false)
    private OffsetDateTime abertoEm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "solicitante_id")
    private Usuario solicitante;

    protected Chamado() {
    }

    Chamado(String codigo, AbrirChamadoRequest request, OffsetDateTime abertoEm) {
        this(codigo, request, abertoEm, null);
    }

    Chamado(String codigo, AbrirChamadoRequest request, OffsetDateTime abertoEm, Usuario solicitante) {
        this.id = UUID.randomUUID();
        this.codigo = codigo;
        this.cliente = request.cliente().trim();
        this.telefone = valorOuVazio(request.telefone());
        this.modelo = request.modelo().trim();
        this.placa = valorOuVazio(request.placa()).toUpperCase(Locale.ROOT);
        this.tipo = request.tipo().trim();
        this.prioridade = "Média";
        this.descricao = valorOuVazio(request.descricao());
        this.localizacao = valorOuVazio(request.localizacao());
        this.status = StatusChamado.ABERTO;
        this.abertoEm = abertoEm;
        this.solicitante = solicitante;
    }

    private static String valorOuVazio(String valor) {
        return valor == null ? "" : valor.trim();
    }

    UUID getId() {
        return id;
    }

    String getCodigo() {
        return codigo;
    }

    String getCliente() {
        return cliente;
    }

    String getTelefone() {
        return telefone;
    }

    String getModelo() {
        return modelo;
    }

    String getPlaca() {
        return placa;
    }

    String getTipo() {
        return tipo;
    }

    String getPrioridade() {
        return prioridade;
    }

    String getDescricao() {
        return descricao;
    }

    String getLocalizacao() {
        return localizacao;
    }

    StatusChamado getStatus() {
        return status;
    }

    OffsetDateTime getAbertoEm() {
        return abertoEm;
    }

    Usuario getSolicitante() {
        return solicitante;
    }
}
