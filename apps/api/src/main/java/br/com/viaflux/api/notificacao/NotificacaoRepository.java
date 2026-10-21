package br.com.viaflux.api.notificacao;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface NotificacaoRepository extends JpaRepository<Notificacao, UUID> {

    List<Notificacao> findTop100ByDestinatarioIdOrderByCriadaEmDesc(UUID destinatarioId);

    Optional<Notificacao> findByIdAndDestinatarioId(UUID id, UUID destinatarioId);

    @Modifying
    @Query("UPDATE Notificacao notificacao SET notificacao.lida = true WHERE notificacao.destinatarioId = :destinatarioId AND notificacao.lida = false")
    int marcarTodasComoLidas(@Param("destinatarioId") UUID destinatarioId);
}
