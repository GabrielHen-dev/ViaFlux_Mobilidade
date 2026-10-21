package br.com.viaflux.api.chamado;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface ChamadoRepository extends JpaRepository<Chamado, UUID> {

    Optional<Chamado> findByCodigo(String codigo);

    Optional<Chamado> findByChaveIdempotencia(String chaveIdempotencia);

    List<Chamado> findByExcluidoEmIsNotNullOrderByExcluidoEmDesc();

    @Query("""
            SELECT chamado
            FROM Chamado chamado
            WHERE chamado.excluidoEm IS NULL
              AND (:busca IS NULL
                OR LOWER(chamado.codigo) LIKE :busca
                OR LOWER(chamado.cliente) LIKE :busca
                OR LOWER(chamado.modelo) LIKE :busca
                OR LOWER(chamado.placa) LIKE :busca)
            """)
    List<Chamado> buscarAtivos(@Param("busca") String busca);

    @Query(value = "SELECT nextval('viaflux.chamados_numero_seq')", nativeQuery = true)
    long proximoNumero();
}
