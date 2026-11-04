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

    @Column(name = "criada_em", nullable = false)
    private OffsetDateTime criadaEm;

    @Column(nullable = false)
    private boolean lida;

    @Column(name = "email_adiado_desde")
    private OffsetDateTime emailAdiadoDesde;

    @Column(name = "email_tentativas", nullable = false)
    private int emailTentativas;

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

    static Notificacao comEmailAdiado(UUID destinatarioId, UUID chamadoId, String chamadoCodigo, String novoStatus, String mensagem, OffsetDateTime criadaEm) {
        Notificacao notificacao = new Notificacao(destinatarioId, chamadoId, chamadoCodigo, novoStatus, mensagem, criadaEm);
        notificacao.emailAdiadoDesde = criadaEm;
        return notificacao;
    }

    void marcarComoLida() {
        this.lida = true;
        this.emailAdiadoDesde = null;
    }

    void atualizarMensagem(String mensagem, OffsetDateTime instante) {
        this.mensagem = mensagem;
        this.criadaEm = instante;
    }

    void concluirEsperaDoEmail() {
        this.emailAdiadoDesde = null;
    }

    int registrarFalhaDoEmail() {
        this.emailTentativas += 1;
        return emailTentativas;
    }

    UUID getChamadoId() {
        return chamadoId;
    }

    UUID getDestinatarioId() {
        return destinatarioId;
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
