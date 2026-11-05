package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.Usuario;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface LiderancaRepository extends Repository<Usuario, UUID> {

    @Query("select distinct usuario from Usuario usuario join usuario.perfis perfil "
            + "where usuario.ativo = true and perfil.codigo in :perfis order by usuario.nome")
    public List<Usuario> ativosComPerfil(@Param("perfis") Collection<String> perfis);

    @Query("select distinct usuario from Usuario usuario join usuario.perfis perfil join usuario.departamentos departamento "
            + "where usuario.ativo = true and perfil.codigo = 'DEPARTAMENTO' and departamento.codigo = :departamento order by usuario.nome")
    public List<Usuario> ativosDoDepartamento(@Param("departamento") String departamento);
}
