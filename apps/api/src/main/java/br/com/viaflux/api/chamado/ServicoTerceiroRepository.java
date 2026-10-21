package br.com.viaflux.api.chamado;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

interface ServicoTerceiroRepository extends JpaRepository<ServicoTerceiro, UUID> {

    List<ServicoTerceiro> findByChamadoIdAndCanceladoFalseOrderByAtualizadoEmDesc(UUID chamadoId);

    List<ServicoTerceiro> findByChamadoIdInAndCanceladoFalse(Collection<UUID> chamadoIds);

    List<ServicoTerceiro> findByFornecedorIdAndCanceladoFalseOrderByAtualizadoEmDesc(UUID fornecedorId);
}
