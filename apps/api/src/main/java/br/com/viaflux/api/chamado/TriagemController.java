package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.IdentificacaoDoUsuario;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chamados/{codigo}")
@Tag(name = "Triagem", description = "Triagem manual, reclassificação e override de prioridade")
class TriagemController {

    private final IdentificacaoDoUsuario identificacao;
    private final TriagemService triagem;

    TriagemController(IdentificacaoDoUsuario identificacao, TriagemService triagem) {
        this.identificacao = identificacao;
        this.triagem = triagem;
    }

    @PostMapping("/triagem/inicio")
    @Operation(
            summary = "Assumir a análise do chamado",
            description = "Registra o atendente como responsável pela análise. Chamados sem classificação passam a Em triagem; chamados "
                    + "classificados pelo relato mantêm o status e a fila. Outro atendente pode assumir no lugar. Se não houver análise "
                    + "pendente, a resposta é 409. Perfis: ADMIN e ATENDENTE.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ChamadoResponse iniciar(@PathVariable String codigo, @AuthenticationPrincipal Jwt token) {
        return triagem.iniciar(codigo, identificacao.de(token));
    }

    @PostMapping("/triagem")
    @Operation(
            summary = "Concluir a triagem",
            description = "O atendente define tipo, severidade e urgência, com pesos 1, 3 ou 5. Score = severidade + urgência: 10 é P1, 8 é P2, "
                    + "6 é P3 e abaixo disso P4. Sem departamento, vale o tipo, exceto P1 operacional fora do horário comercial, que vai para a "
                    + "Assistência 24h. Não é preciso assumir antes. O chamado vai para Na fila no departamento. Perfis: ADMIN e ATENDENTE.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ChamadoResponse concluir(@PathVariable String codigo, @Valid @RequestBody ConcluirTriagemRequest request, @AuthenticationPrincipal Jwt token) {
        return triagem.concluir(codigo, request, identificacao.de(token));
    }

    @PutMapping("/classificacao")
    @Operation(
            summary = "Reclassificar um chamado já triado",
            description = "Muda tipo, severidade e urgência, com justificativa de pelo menos 10 caracteres. Não muda departamento nem "
                    + "status: para trocar de fila, use a transferência. Vale também para chamados fechados. Perfis: ADMIN e "
                    + "ATENDENTE.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ChamadoResponse reclassificar(@PathVariable String codigo, @Valid @RequestBody ReclassificacaoRequest request, @AuthenticationPrincipal Jwt token) {
        return triagem.reclassificar(codigo, request, identificacao.de(token));
    }

    @PostMapping("/classificacao/confirmacao")
    @Operation(
            summary = "Confirmar a classificação automática",
            description = "Encerra a revisão de um chamado classificado automaticamente pelo relato do motivo \"Outro\", mantendo tipo, "
                    + "severidade e urgência. Para alterar a classificação, use a reclassificação: durante a revisão, se o chamado ainda "
                    + "estiver Na fila, ele é reencaminhado ao departamento do novo tipo. Perfis: ADMIN e ATENDENTE.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ChamadoResponse confirmarClassificacao(@PathVariable String codigo, @AuthenticationPrincipal Jwt token) {
        return triagem.confirmarClassificacao(codigo, identificacao.de(token));
    }

    @PutMapping("/override")
    @Operation(
            summary = "Definir prioridade manualmente",
            description = "Define a prioridade efetiva (P1 a P4) com justificativa de pelo menos 10 caracteres. O score calculado "
                    + "continua registrado, e o SLA passa a seguir a prioridade efetiva. Perfis: ADMIN e ATENDENTE.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ChamadoResponse definirOverride(@PathVariable String codigo, @Valid @RequestBody OverrideRequest request, @AuthenticationPrincipal Jwt token) {
        return triagem.definirOverride(codigo, request, identificacao.de(token));
    }

    @DeleteMapping("/override")
    @Operation(
            summary = "Voltar à prioridade calculada",
            description = "Remove o override; vale de novo a prioridade calculada pelo score. Perfis: ADMIN e ATENDENTE.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ChamadoResponse removerOverride(@PathVariable String codigo, @AuthenticationPrincipal Jwt token) {
        return triagem.removerOverride(codigo, identificacao.de(token));
    }
}
