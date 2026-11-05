package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.Usuario;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface EquipeDoDepartamentoRepository extends Repository<Usuario, UUID> {

    @Query("select distinct usuario from Usuario usuario join usuario.perfis perfil join usuario.departamentos departamento "
            + "where usuario.ativo = true and perfil.codigo = :perfil and departamento.codigo = :departamento order by usuario.nome")
    public List<Usuario> ativosComPerfilNoDepartamento(@Param("perfil") String perfil, @Param("departamento") String departamento);
}
