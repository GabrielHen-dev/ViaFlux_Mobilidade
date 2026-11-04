package br.com.viaflux.api.chamado;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface AlertaDeSlaRepository extends JpaRepository<AlertaDeSla, UUID> {

    List<AlertaDeSla> findByChamadoId(UUID chamadoId);
}
