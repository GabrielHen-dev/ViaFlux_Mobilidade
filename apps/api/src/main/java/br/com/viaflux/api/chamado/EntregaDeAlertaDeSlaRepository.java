package br.com.viaflux.api.chamado;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

interface EntregaDeAlertaDeSlaRepository extends JpaRepository<EntregaDeAlertaDeSla, UUID> {

    @EntityGraph(attributePaths = {"alerta", "alerta.chamado"})
    List<EntregaDeAlertaDeSla> findTop100ByEstadoAndProximaTentativaEmLessThanEqualOrderByProximaTentativaEmAsc(
            EstadoDaEntregaDeAlerta estado, OffsetDateTime instante);
}
