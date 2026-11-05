package br.com.viaflux.api.chamado.classificacao;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MotivoRepository extends JpaRepository<Motivo, String> {

    public List<Motivo> findAllByOrderByTipoAscOrdemAsc();
}
