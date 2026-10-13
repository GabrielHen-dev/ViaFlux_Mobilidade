package br.com.viaflux.api.chamado;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface ChamadoEventoRepository extends JpaRepository<ChamadoEvento, UUID> {

    List<ChamadoEvento> findByChamadoCodigoOrderByOcorridoEmAscIdAsc(String codigo);
}
