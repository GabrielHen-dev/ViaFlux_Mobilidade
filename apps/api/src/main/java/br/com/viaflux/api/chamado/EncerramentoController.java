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
@RequestMapping("/api/chamados")
@Tag(name = "Encerramento", description = "Confirmação, contestação e reabertura pelo solicitante")
class EncerramentoController {

    private final IdentificacaoDoUsuario identificacao;
    private final EncerramentoService encerramento;

    EncerramentoController(IdentificacaoDoUsuario identificacao, EncerramentoService encerramento) {
        this.identificacao = identificacao;
        this.encerramento = encerramento;
    }

    @PostMapping("/{codigo}/resolucao/confirmacao")
    @Operation(
            summary = "Confirmar a solução",
            description = "O solicitante confirma um chamado Resolvido, que passa para Fechado. Sem resposta em 3 dias úteis o "
                    + "fechamento é automático, com lembrete 1 dia útil antes. Perfis: CLIENTE e GESTOR_FROTA.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ChamadoResponse confirmar(@PathVariable String codigo, @AuthenticationPrincipal Jwt token) {
        return encerramento.confirmar(codigo, identificacao.de(token));
    }

    @PostMapping("/{codigo}/resolucao/contestacao")
    @Operation(
            summary = "Contestar a solução",
            description = "O solicitante informa que o problema continua: o chamado Resolvido volta para atendimento no mesmo "
                    + "episódio e o relógio de resolução segue contando desde a abertura. Perfis: CLIENTE e GESTOR_FROTA.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ChamadoResponse contestar(@PathVariable String codigo, @Valid @RequestBody MotivoDoSolicitanteRequest request,
                              @AuthenticationPrincipal Jwt token) {
        return encerramento.contestar(codigo, request, identificacao.de(token));
    }

    @PostMapping("/{codigo}/reabertura")
    @Operation(
            summary = "Reabrir chamado fechado",
            description = "Até 5 dias úteis após o fechamento, o solicitante reabre o chamado com o mesmo protocolo e histórico, em "
                    + "um novo episódio na fila do departamento. Depois disso a resposta é 409. Perfis: CLIENTE e GESTOR_FROTA.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ChamadoResponse reabrir(@PathVariable String codigo, @Valid @RequestBody MotivoDoSolicitanteRequest request,
                            @AuthenticationPrincipal Jwt token) {
        return encerramento.reabrir(codigo, request, identificacao.de(token));
    }
}
