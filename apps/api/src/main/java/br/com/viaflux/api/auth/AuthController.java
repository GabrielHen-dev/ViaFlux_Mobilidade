package br.com.viaflux.api.auth;

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
    SessaoResponse login(@Valid @RequestBody LoginRequest requisicao) {
        return authService.entrar(requisicao.email(), requisicao.senha());
    }

    @PostMapping("/refresh")
    SessaoResponse renovar(@Valid @RequestBody RenovacaoRequest requisicao) {
        return authService.renovar(requisicao.refreshToken());
    }

    @GetMapping("/me")
    UsuarioResponse usuarioAtual(@AuthenticationPrincipal Jwt token) {
        return authService.usuarioAtual(UUID.fromString(token.getSubject()));
    }
}
