package br.com.viaflux.api.usuario;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

public record UsuarioAdminResponse(
        UUID id,
        String nome,
        String email,
        boolean ativo,
        boolean convitePendente,
        List<UsuarioResponse.PerfilResponse> perfis,
        UsuarioResponse.OrganizacaoResponse organizacao,
        List<UsuarioResponse.DepartamentoResponse> departamentos
) {

    static UsuarioAdminResponse de(Usuario usuario) {
        List<UsuarioResponse.PerfilResponse> perfis = usuario.getPerfis().stream()
                .sorted(Comparator.comparing(Perfil::getCodigo))
                .map(perfil -> new UsuarioResponse.PerfilResponse(perfil.getCodigo(), perfil.getDescricao()))
                .toList();
        Organizacao organizacao = usuario.getOrganizacao();
        UsuarioResponse.OrganizacaoResponse organizacaoResponse = organizacao == null
                ? null
                : new UsuarioResponse.OrganizacaoResponse(
                        organizacao.getId(), organizacao.getNome(), organizacao.getTipo().name()
                );
        List<UsuarioResponse.DepartamentoResponse> departamentos = usuario.getDepartamentos().stream()
                .sorted(Comparator.comparing(Departamento::getCodigo))
                .map(departamento -> new UsuarioResponse.DepartamentoResponse(
                        departamento.getCodigo(), departamento.getNome()
                ))
                .toList();
        return new UsuarioAdminResponse(
                usuario.getId(), usuario.getNome(), usuario.getEmail(), usuario.isAtivo(), usuario.convitePendente(),
                perfis, organizacaoResponse, departamentos
        );
    }
}
