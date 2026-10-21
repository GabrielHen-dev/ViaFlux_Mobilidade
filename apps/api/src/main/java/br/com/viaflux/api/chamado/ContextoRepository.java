package br.com.viaflux.api.chamado;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

interface ContextoRepository extends JpaRepository<Contexto, String> {

    List<Contexto> findAllByOrderByTipoAscOrdemAsc();

    List<Contexto> findByTipoOrderByOrdemAsc(TipoChamado tipo);
}
