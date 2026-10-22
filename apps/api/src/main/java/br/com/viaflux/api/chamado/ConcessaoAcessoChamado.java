package br.com.viaflux.api.chamado;

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
@Table(name = "concessao_acesso_chamado")
class ConcessaoAcessoChamado {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "chamado_id", nullable = false) private Chamado chamado;
    @Column(name = "usuario_id", nullable = false) private UUID usuarioId;
    @Column(nullable = false, columnDefinition = "text") private String justificativa;
    @Column(name = "concedido_em", nullable = false) private OffsetDateTime concedidoEm;
    @Column(name = "expira_em", nullable = false) private OffsetDateTime expiraEm;

    protected ConcessaoAcessoChamado() { }
    ConcessaoAcessoChamado(Chamado chamado, UUID usuarioId, String justificativa, OffsetDateTime agora) {
        id = UUID.randomUUID(); this.chamado = chamado; this.usuarioId = usuarioId;
        this.justificativa = justificativa; concedidoEm = agora; expiraEm = agora.plusMinutes(15);
    }
}
