package br.com.viaflux.api.chamado;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

interface MotivoRepository extends JpaRepository<Motivo, String> {

    List<Motivo> findAllByOrderByTipoAscOrdemAsc();
}
