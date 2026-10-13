package br.com.viaflux.api.chamado;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;
import java.util.Optional;

interface ChamadoRepository extends JpaRepository<Chamado, UUID> {

    Optional<Chamado> findByCodigo(String codigo);

    @Query(value = "SELECT nextval('viaflux.chamados_numero_seq')", nativeQuery = true)
    long proximoNumero();
}
