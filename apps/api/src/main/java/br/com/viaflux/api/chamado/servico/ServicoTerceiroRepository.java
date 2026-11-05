package br.com.viaflux.api.chamado.servico;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ServicoTerceiroRepository extends JpaRepository<ServicoTerceiro, UUID> {

    public List<ServicoTerceiro> findByChamadoIdAndCanceladoFalseOrderByAtualizadoEmDesc(UUID chamadoId);

    public List<ServicoTerceiro> findByChamadoIdInAndCanceladoFalse(Collection<UUID> chamadoIds);

    public List<ServicoTerceiro> findByFornecedorIdAndCanceladoFalseOrderByAtualizadoEmDesc(UUID fornecedorId);
}
