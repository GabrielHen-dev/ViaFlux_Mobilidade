package br.com.viaflux.api.usuario;

import java.util.Comparator;
import java.util.List;

public record UsuarioAdminOpcoesResponse(
        List<UsuarioResponse.PerfilResponse> perfis,
        List<UsuarioResponse.DepartamentoResponse> departamentos,
        List<UsuarioResponse.OrganizacaoResponse> organizacoes
) {

    static UsuarioAdminOpcoesResponse de(
            List<Perfil> perfis,
            List<Departamento> departamentos,
            List<Organizacao> organizacoes
    ) {
        return new UsuarioAdminOpcoesResponse(
                perfis.stream()
                        .sorted(Comparator.comparing(Perfil::getCodigo))
                        .map(perfil -> new UsuarioResponse.PerfilResponse(perfil.getCodigo(), perfil.getDescricao()))
                        .toList(),
                departamentos.stream()
                        .sorted(Comparator.comparing(Departamento::getCodigo))
                        .map(departamento -> new UsuarioResponse.DepartamentoResponse(
                                departamento.getCodigo(), departamento.getNome()
                        ))
                        .toList(),
                organizacoes.stream()
                        .sorted(Comparator.comparing(Organizacao::getNome))
                        .map(organizacao -> new UsuarioResponse.OrganizacaoResponse(
                                organizacao.getId(), organizacao.getNome(), organizacao.getTipo().name()
                        ))
                        .toList()
        );
    }
}
