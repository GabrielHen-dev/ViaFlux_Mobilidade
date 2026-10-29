package br.com.viaflux.api.conta;

import br.com.viaflux.api.usuario.Usuario;
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
@Table(name = "token_de_conta")
class TokenDeConta {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FinalidadeDoToken finalidade;

    @Column(name = "hash_do_token", nullable = false, length = 64)
    private String hashDoToken;

    @Column(name = "criado_em", nullable = false)
    private OffsetDateTime criadoEm;

    @Column(name = "expira_em", nullable = false)
    private OffsetDateTime expiraEm;

    @Column(name = "usado_em")
    private OffsetDateTime usadoEm;

    protected TokenDeConta() {
    }

    TokenDeConta(Usuario usuario, FinalidadeDoToken finalidade, String hashDoToken, OffsetDateTime criadoEm, OffsetDateTime expiraEm) {
        this.id = UUID.randomUUID();
        this.usuario = usuario;
        this.finalidade = finalidade;
        this.hashDoToken = hashDoToken;
        this.criadoEm = criadoEm;
        this.expiraEm = expiraEm;
    }

    boolean utilizavelEm(OffsetDateTime agora) {
        return usadoEm == null && agora.isBefore(expiraEm);
    }

    void usar(OffsetDateTime agora) {
        this.usadoEm = agora;
    }

    Usuario getUsuario() {
        return usuario;
    }

    FinalidadeDoToken getFinalidade() {
        return finalidade;
    }

    OffsetDateTime getExpiraEm() {
        return expiraEm;
    }

    OffsetDateTime getUsadoEm() {
        return usadoEm;
    }
}
