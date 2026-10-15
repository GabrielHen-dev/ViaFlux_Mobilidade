package br.com.viaflux.api.usuario;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OrganizacaoRepository extends JpaRepository<Organizacao, UUID> {

    List<Organizacao> findAllByOrderByNomeAsc();
}
