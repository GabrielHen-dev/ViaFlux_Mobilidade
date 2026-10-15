package br.com.viaflux.api.usuario;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DepartamentoRepository extends JpaRepository<Departamento, String> {

    List<Departamento> findAllByOrderByNomeAsc();
}
