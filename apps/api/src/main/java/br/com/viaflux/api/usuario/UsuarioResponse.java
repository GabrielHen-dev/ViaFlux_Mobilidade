package br.com.viaflux.api.usuario;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

public record UsuarioResponse(UUID id, String nome, String email, List<PerfilResponse> perfis) {

    public record PerfilResponse(String codigo, String descricao) {
    }

    public static UsuarioResponse de(Usuario usuario) {
        List<PerfilResponse> perfis = usuario.getPerfis().stream()
                .sorted(Comparator.comparing(Perfil::getCodigo))
                .map(perfil -> new PerfilResponse(perfil.getCodigo(), perfil.getDescricao()))
                .toList();
        return new UsuarioResponse(usuario.getId(), usuario.getNome(), usuario.getEmail(), perfis);
    }
}
