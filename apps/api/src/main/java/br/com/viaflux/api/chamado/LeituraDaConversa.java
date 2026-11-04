package br.com.viaflux.api.chamado;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "chamado_leitura")
@IdClass(LeituraDaConversa.Chave.class)
class LeituraDaConversa {

    @Id
    @Column(name = "chamado_id")
    private UUID chamadoId;

    @Id
    @Column(name = "usuario_id")
    private UUID usuarioId;

    @Column(name = "lido_ate", nullable = false)
    private OffsetDateTime lidoAte;

    protected LeituraDaConversa() {
    }

    OffsetDateTime getLidoAte() {
        return lidoAte;
    }

    static class Chave implements Serializable {

        private UUID chamadoId;
        private UUID usuarioId;

        protected Chave() {
        }

        @Override
        public boolean equals(Object outro) {
            return outro instanceof Chave chave
                    && Objects.equals(chamadoId, chave.chamadoId)
                    && Objects.equals(usuarioId, chave.usuarioId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(chamadoId, usuarioId);
        }
    }
}
