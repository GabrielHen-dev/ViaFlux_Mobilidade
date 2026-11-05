package br.com.viaflux.api.chamado;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ChamadoEventoRepository extends JpaRepository<ChamadoEvento, UUID> {

    public List<ChamadoEvento> findByChamadoIdOrderByOcorridoEmAscSequenciaAsc(UUID chamadoId);

    public List<ChamadoEvento> findByChamadoIdAndTipoOrderByOcorridoEmAscSequenciaAsc(UUID chamadoId, TipoEvento tipo);

    public List<ChamadoEvento> findByChamadoIdInAndTipoIn(Collection<UUID> chamadoIds, Collection<TipoEvento> tipos);
}
