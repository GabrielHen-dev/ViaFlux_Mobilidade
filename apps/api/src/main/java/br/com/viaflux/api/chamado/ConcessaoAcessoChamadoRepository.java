package br.com.viaflux.api.chamado;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.OffsetDateTime;
import java.util.UUID;

interface ConcessaoAcessoChamadoRepository extends JpaRepository<ConcessaoAcessoChamado, UUID> {
    @Query("select (count(c) > 0) from ConcessaoAcessoChamado c where c.chamado.id = :chamadoId and c.usuarioId = :usuarioId and c.expiraEm > :agora")
    boolean temAcessoAtivo(@Param("chamadoId") UUID chamadoId, @Param("usuarioId") UUID usuarioId, @Param("agora") OffsetDateTime agora);
}
