package br.com.viaflux.api.auth;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import br.com.viaflux.api.usuario.UsuarioResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/auth")
@Tag(name = "Autenticação", description = "Login com JWT (access e refresh token) e dados do usuário logado")
class AuthController {

    record LoginRequest(
            @NotBlank(message = "Informe o e-mail.") @Email(message = "Informe um e-mail válido.") String email,
            @NotBlank(message = "Informe a senha.") String senha
    ) {
    }

    record RenovacaoRequest(@NotBlank String refreshToken) {
    }

    private final AuthService authService;

    AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    @Operation(
            summary = "Entrar com e-mail e senha",
            description = "Público. Devolve o access token (JWT, validade de JWT_ACCESS_TTL), o refresh token (JWT_REFRESH_TTL) e os "
                    + "dados do usuário com perfis, organização e departamentos. E-mail ou senha inválidos, ou usuário inativo, "
                    + "respondem 401."
    )
    SessaoResponse login(@Valid @RequestBody LoginRequest requisicao) {
        return authService.entrar(requisicao.email(), requisicao.senha());
    }

    @PostMapping("/refresh")
    @Operation(
            summary = "Renovar a sessão",
            description = "Público. Troca um refresh token válido por uma sessão nova, com novo access token. Refresh token inválido, "
                    + "expirado ou de usuário inativo responde 401."
    )
    SessaoResponse renovar(@Valid @RequestBody RenovacaoRequest requisicao) {
        return authService.renovar(requisicao.refreshToken());
    }

    @GetMapping("/me")
    @Operation(
            summary = "Consultar o usuário logado",
            description = "Dados, perfis, organização e departamentos do dono do token. Qualquer usuário autenticado.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    UsuarioResponse usuarioAtual(@AuthenticationPrincipal Jwt token) {
        return authService.usuarioAtual(UUID.fromString(token.getSubject()));
    }
}
