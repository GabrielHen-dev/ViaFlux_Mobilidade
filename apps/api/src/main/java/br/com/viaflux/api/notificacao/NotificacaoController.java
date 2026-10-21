package br.com.viaflux.api.notificacao;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notificacoes")
@Tag(name = "Notificações", description = "Central de notificações do usuário autenticado")
class NotificacaoController {

    private final CentralDeNotificacoes central;

    NotificacaoController(CentralDeNotificacoes central) {
        this.central = central;
    }

    @GetMapping
    @Operation(
            summary = "Listar minhas notificações",
            description = "As 100 notificações mais recentes do usuário autenticado, da mais nova para a mais antiga. Qualquer usuário "
                    + "autenticado.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    List<NotificacaoResponse> listar(@AuthenticationPrincipal Jwt token) {
        return central.doUsuario(UUID.fromString(token.getSubject()));
    }

    @PatchMapping("/{id}/lida")
    @Operation(
            summary = "Marcar notificação como lida",
            description = "Só altera notificações do próprio usuário. Qualquer usuário autenticado.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ResponseEntity<Void> marcarComoLida(@PathVariable UUID id, @AuthenticationPrincipal Jwt token) {
        central.marcarComoLida(id, UUID.fromString(token.getSubject()));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/leitura")
    @Operation(
            summary = "Marcar todas as notificações como lidas",
            description = "Qualquer usuário autenticado.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ResponseEntity<Void> marcarTodasComoLidas(@AuthenticationPrincipal Jwt token) {
        central.marcarTodasComoLidas(UUID.fromString(token.getSubject()));
        return ResponseEntity.noContent().build();
    }
}
