package br.com.viaflux.api.chamado;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface ChamadoAnexoRepository extends JpaRepository<ChamadoAnexo, UUID> {

    List<ChamadoAnexo> findByChamadoIdOrderByEnviadoEmAsc(UUID chamadoId);

    List<ChamadoAnexo> findByChamadoIdIn(Collection<UUID> chamadoIds);

    Optional<ChamadoAnexo> findByChamadoIdAndChaveIdempotencia(UUID chamadoId, String chaveIdempotencia);

    Optional<ChamadoAnexo> findByIdAndChamadoId(UUID id, UUID chamadoId);
}
