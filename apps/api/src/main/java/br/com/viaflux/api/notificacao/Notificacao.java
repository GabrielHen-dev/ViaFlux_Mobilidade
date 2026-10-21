package br.com.viaflux.api.notificacao;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "notificacao")
class Notificacao {

    @Id
    private UUID id;

    @Column(name = "destinatario_id", nullable = false, updatable = false)
    private UUID destinatarioId;

    @Column(name = "chamado_id", nullable = false, updatable = false)
    private UUID chamadoId;

    @Column(name = "chamado_codigo", nullable = false, length = 20, updatable = false)
    private String chamadoCodigo;

    @Column(name = "novo_status", nullable = false, length = 80)
    private String novoStatus;

    @Column(nullable = false, length = 255)
    private String mensagem;

    @Column(name = "criada_em", nullable = false, updatable = false)
    private OffsetDateTime criadaEm;

    @Column(nullable = false)
    private boolean lida;

    protected Notificacao() {
    }

    Notificacao(UUID destinatarioId, UUID chamadoId, String chamadoCodigo, String novoStatus, String mensagem, OffsetDateTime criadaEm) {
        this.id = UUID.randomUUID();
        this.destinatarioId = destinatarioId;
        this.chamadoId = chamadoId;
        this.chamadoCodigo = chamadoCodigo;
        this.novoStatus = novoStatus;
        this.mensagem = mensagem;
        this.criadaEm = criadaEm;
    }

    void marcarComoLida() {
        this.lida = true;
    }

    UUID getId() {
        return id;
    }

    String getChamadoCodigo() {
        return chamadoCodigo;
    }

    String getNovoStatus() {
        return novoStatus;
    }

    String getMensagem() {
        return mensagem;
    }

    OffsetDateTime getCriadaEm() {
        return criadaEm;
    }

    boolean isLida() {
        return lida;
    }
}
