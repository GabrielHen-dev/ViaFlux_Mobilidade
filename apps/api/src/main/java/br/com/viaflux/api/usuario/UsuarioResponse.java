package br.com.viaflux.api.usuario;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

public record UsuarioResponse(
        UUID id,
        String nome,
        String email,
        List<PerfilResponse> perfis,
        OrganizacaoResponse organizacao,
        List<DepartamentoResponse> departamentos
) {

    public record PerfilResponse(String codigo, String descricao) {
    }

    public record OrganizacaoResponse(UUID id, String nome, String tipo) {
    }

    public record DepartamentoResponse(String codigo, String nome) {
    }

    public static UsuarioResponse de(Usuario usuario) {
        List<PerfilResponse> perfis = usuario.getPerfis().stream()
                .sorted(Comparator.comparing(Perfil::getCodigo))
                .map(perfil -> new PerfilResponse(perfil.getCodigo(), perfil.getDescricao()))
                .toList();
        Organizacao organizacao = usuario.getOrganizacao();
        OrganizacaoResponse organizacaoResponse = organizacao == null
                ? null
                : new OrganizacaoResponse(
                        organizacao.getId(),
                        organizacao.getNome(),
                        organizacao.getTipo().name()
                );
        List<DepartamentoResponse> departamentos = usuario.getDepartamentos().stream()
                .sorted(Comparator.comparing(Departamento::getCodigo))
                .map(departamento -> new DepartamentoResponse(departamento.getCodigo(), departamento.getNome()))
                .toList();
        return new UsuarioResponse(
                usuario.getId(), usuario.getNome(), usuario.getEmail(), perfis, organizacaoResponse, departamentos
        );
    }
}
