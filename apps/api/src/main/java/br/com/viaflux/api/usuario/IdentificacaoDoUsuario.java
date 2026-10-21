package br.com.viaflux.api.usuario;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class IdentificacaoDoUsuario {

    private final UsuarioRepository usuarios;

    IdentificacaoDoUsuario(UsuarioRepository usuarios) {
        this.usuarios = usuarios;
    }

    @Transactional(readOnly = true)
    public UsuarioAtual de(Jwt token) {
        UUID id = UUID.fromString(token.getSubject());
        Usuario usuario = usuarios.findById(id)
                .filter(Usuario::isAtivo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não encontrado ou inativo."));
        List<String> perfisDoToken = token.getClaimAsStringList("perfis");
        Set<String> perfis = perfisDoToken == null ? Set.of() : Set.copyOf(perfisDoToken);
        Set<String> departamentos = usuario.getDepartamentos().stream()
                .map(Departamento::getCodigo)
                .collect(Collectors.toUnmodifiableSet());
        UUID organizacaoId = usuario.getOrganizacao() == null ? null : usuario.getOrganizacao().getId();
        return new UsuarioAtual(id, usuario.getNome(), perfis, departamentos, organizacaoId);
    }
}
