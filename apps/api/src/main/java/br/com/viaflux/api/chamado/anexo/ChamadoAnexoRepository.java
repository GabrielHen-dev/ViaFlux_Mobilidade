package br.com.viaflux.api.chamado.anexo;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChamadoAnexoRepository extends JpaRepository<ChamadoAnexo, UUID> {

    public List<ChamadoAnexo> findByChamadoIdOrderByEnviadoEmAsc(UUID chamadoId);

    public List<ChamadoAnexo> findByChamadoIdIn(Collection<UUID> chamadoIds);

    public Optional<ChamadoAnexo> findByChamadoIdAndChaveIdempotencia(UUID chamadoId, String chaveIdempotencia);

    public Optional<ChamadoAnexo> findByIdAndChamadoId(UUID id, UUID chamadoId);
}
