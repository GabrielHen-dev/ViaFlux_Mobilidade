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
@RequestMapping("/api/chamados/{codigo}/cancelamento")
@Tag(name = "Cancelamento", description = "Cancelamento e reabertura de chamados cancelados")
class CancelamentoController {

    private final IdentificacaoDoUsuario identificacao;
    private final CancelamentoService cancelamento;

    CancelamentoController(IdentificacaoDoUsuario identificacao, CancelamentoService cancelamento) {
        this.identificacao = identificacao;
        this.cancelamento = cancelamento;
    }

    @PostMapping
    @Operation(
            summary = "Cancelar chamado",
            description = "O chamado passa para Cancelado e continua nas listas e no histórico, com o SLA congelado. Exige motivo. "
                    + "Chamados resolvidos, fechados ou já cancelados respondem 409. O solicitante é notificado. Perfis: ADMIN, "
                    + "ATENDENTE e DEPARTAMENTO (só a própria fila).",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ChamadoResponse cancelar(@PathVariable String codigo, @Valid @RequestBody CancelamentoRequest request, @AuthenticationPrincipal Jwt token) {
        return cancelamento.cancelar(codigo, request, identificacao.de(token));
    }

    @PostMapping("/reabertura")
    @Operation(
            summary = "Reabrir chamado cancelado",
            description = "Desfaz um cancelamento indevido: o chamado volta para Aberto (se ainda não foi classificado), Em atendimento "
                    + "(se tinha responsável) ou Na fila, e o período cancelado não conta no SLA de resolução. Exige motivo. Perfis: "
                    + "ADMIN, ATENDENTE, DEPARTAMENTO (só a própria fila), CLIENTE e GESTOR_FROTA (só o próprio chamado).",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ChamadoResponse reabrir(@PathVariable String codigo, @Valid @RequestBody ReaberturaDoCancelamentoRequest request,
                            @AuthenticationPrincipal Jwt token) {
        return cancelamento.reabrir(codigo, request, identificacao.de(token));
    }
}
