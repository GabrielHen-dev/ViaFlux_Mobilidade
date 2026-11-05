package br.com.viaflux.api.chamado;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AlertaDeSlaRepository extends JpaRepository<AlertaDeSla, UUID> {

    public List<AlertaDeSla> findByChamadoId(UUID chamadoId);
}
