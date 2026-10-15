package br.com.viaflux.api.usuario;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {

    Optional<Usuario> findByEmail(String email);

    Page<Usuario> findAllByOrderByNomeAsc(Pageable pageable);

    @Query("select count(distinct usuario) from Usuario usuario join usuario.perfis perfil " +
            "where perfil.codigo = :perfil and usuario.ativo = true")
    long countAtivosComPerfil(@Param("perfil") String perfil);
}
