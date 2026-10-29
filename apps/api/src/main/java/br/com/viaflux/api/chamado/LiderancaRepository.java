package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.Usuario;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

interface LiderancaRepository extends Repository<Usuario, UUID> {

    @Query("select distinct usuario from Usuario usuario join usuario.perfis perfil "
            + "where usuario.ativo = true and perfil.codigo in :perfis order by usuario.nome")
    List<Usuario> ativosComPerfil(@Param("perfis") Collection<String> perfis);
}
