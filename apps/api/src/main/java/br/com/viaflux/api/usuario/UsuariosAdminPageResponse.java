package br.com.viaflux.api.usuario;

import org.springframework.data.domain.Page;

import java.util.List;

public record UsuariosAdminPageResponse(
        List<UsuarioAdminResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {

    static UsuariosAdminPageResponse de(Page<Usuario> usuarios) {
        return new UsuariosAdminPageResponse(
                usuarios.getContent().stream().map(UsuarioAdminResponse::de).toList(),
                usuarios.getNumber(),
                usuarios.getSize(),
                usuarios.getTotalElements(),
                usuarios.getTotalPages()
        );
    }
}
