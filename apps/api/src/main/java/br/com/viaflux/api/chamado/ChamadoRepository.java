package br.com.viaflux.api.chamado;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;
import java.util.Optional;

interface ChamadoRepository extends JpaRepository<Chamado, UUID> {

    Optional<Chamado> findByCodigo(String codigo);

    @Query("""
            SELECT chamado
            FROM Chamado chamado
            WHERE (:busca IS NULL
                OR LOWER(chamado.codigo) LIKE :busca
                OR LOWER(chamado.cliente) LIKE :busca
                OR LOWER(chamado.modelo) LIKE :busca)
              AND (:status IS NULL OR chamado.status = :status)
              AND (:prioridade IS NULL OR chamado.prioridade = :prioridade)
            """)
    Page<Chamado> buscar(
            @Param("busca") String busca,
            @Param("status") StatusChamado status,
            @Param("prioridade") String prioridade,
            Pageable pageable
    );

    @Query(value = "SELECT nextval('viaflux.chamados_numero_seq')", nativeQuery = true)
    long proximoNumero();
}
