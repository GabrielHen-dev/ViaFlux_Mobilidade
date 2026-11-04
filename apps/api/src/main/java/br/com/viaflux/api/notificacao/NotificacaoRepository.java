package br.com.viaflux.api.notificacao;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface NotificacaoRepository extends JpaRepository<Notificacao, UUID> {

    List<Notificacao> findTop100ByDestinatarioIdOrderByCriadaEmDesc(UUID destinatarioId);

    Optional<Notificacao> findByIdAndDestinatarioId(UUID id, UUID destinatarioId);

    Optional<Notificacao> findFirstByDestinatarioIdAndChamadoIdAndNovoStatusAndLidaFalseOrderByCriadaEmDesc(UUID destinatarioId, UUID chamadoId, String novoStatus);

    List<Notificacao> findByDestinatarioIdAndChamadoIdAndNovoStatusAndLidaFalse(UUID destinatarioId, UUID chamadoId, String novoStatus);

    List<Notificacao> findByLidaFalseAndEmailAdiadoDesdeLessThanEqual(OffsetDateTime limite);

    List<Notificacao> findByChamadoIdAndNovoStatusAndEmailAdiadoDesdeIsNotNull(UUID chamadoId, String novoStatus);

    @Modifying
    @Query("UPDATE Notificacao notificacao SET notificacao.lida = true, notificacao.emailAdiadoDesde = null WHERE notificacao.destinatarioId = :destinatarioId AND notificacao.lida = false")
    int marcarTodasComoLidas(@Param("destinatarioId") UUID destinatarioId);
}
