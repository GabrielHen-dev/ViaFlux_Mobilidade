package br.com.viaflux.api.chamado;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

interface LeituraDaConversaRepository extends JpaRepository<LeituraDaConversa, LeituraDaConversa.Chave> {

    Optional<LeituraDaConversa> findByChamadoIdAndUsuarioId(UUID chamadoId, UUID usuarioId);

    @Modifying
    @Query(value = """
            INSERT INTO viaflux.chamado_leitura AS leitura (chamado_id, usuario_id, lido_ate)
            VALUES (:chamadoId, :usuarioId, :lidoAte)
            ON CONFLICT (chamado_id, usuario_id)
            DO UPDATE SET lido_ate = GREATEST(leitura.lido_ate, EXCLUDED.lido_ate)
            """, nativeQuery = true)
    void avancar(@Param("chamadoId") UUID chamadoId, @Param("usuarioId") UUID usuarioId, @Param("lidoAte") OffsetDateTime lidoAte);
}
