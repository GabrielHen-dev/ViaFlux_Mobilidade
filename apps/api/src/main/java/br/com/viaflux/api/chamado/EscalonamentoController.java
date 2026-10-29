package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.IdentificacaoDoUsuario;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chamados/{codigo}/escalonamento")
@Tag(name = "Escalonamento", description = "Acionamento da liderança para chamados com SLA vencido")
class EscalonamentoController {

    private final IdentificacaoDoUsuario identificacao;
    private final EscalonamentoService escalonamento;

    EscalonamentoController(IdentificacaoDoUsuario identificacao, EscalonamentoService escalonamento) {
        this.identificacao = identificacao;
        this.escalonamento = escalonamento;
    }

    @PostMapping
    @Operation(
            summary = "Escalonar chamado à liderança",
            description = "Disponível quando a 1ª resposta ou a resolução está com o prazo vencido. Notifica os líderes operacionais "
                    + "ativos (ou os administradores, se não houver líder) e registra o escalonamento no histórico interno. Cada "
                    + "episódio do chamado é escalonado uma única vez; reabrir o chamado libera um novo escalonamento. Perfis: quem "
                    + "atende o chamado (ADMIN, ATENDENTE e o DEPARTAMENTO responsável).",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ChamadoResponse escalonar(@PathVariable String codigo, @Valid @RequestBody(required = false) EscalonamentoRequest request,
                              @AuthenticationPrincipal Jwt token) {
        return escalonamento.escalonar(codigo, request, identificacao.de(token));
    }
}
