package br.com.viaflux.api.chamado;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChamadoRepository extends JpaRepository<Chamado, UUID> {

    public Optional<Chamado> findByCodigo(String codigo);

    public Optional<Chamado> findByChaveIdempotencia(String chaveIdempotencia);

    public List<Chamado> findByExcluidoEmIsNotNullOrderByExcluidoEmDesc();

    public List<Chamado> findByStatusAndExcluidoEmIsNull(StatusChamado status);

    @Query("SELECT chamado.id FROM Chamado chamado WHERE chamado.excluidoEm IS NULL AND chamado.status IN :status")
    public List<UUID> idsComStatus(@Param("status") Collection<StatusChamado> status);

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
    public List<Chamado> buscarAtivos(@Param("busca") String busca);

    @Query(value = "SELECT nextval('viaflux.chamados_numero_seq')", nativeQuery = true)
    public long proximoNumero();
}
