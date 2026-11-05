package br.com.viaflux.api.chamado.classificacao;


import br.com.viaflux.api.chamado.TipoChamado;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContextoRepository extends JpaRepository<Contexto, String> {

    public List<Contexto> findAllByOrderByTipoAscOrdemAsc();

    public List<Contexto> findByTipoOrderByOrdemAsc(TipoChamado tipo);
}
