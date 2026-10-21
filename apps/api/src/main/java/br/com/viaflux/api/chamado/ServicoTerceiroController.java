package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.IdentificacaoDoUsuario;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@Tag(name = "Fornecedores", description = "Serviços terceirizados: acionamento pela Central e atualização pelo fornecedor")
class ServicoTerceiroController {

    private final IdentificacaoDoUsuario identificacao;
    private final ServicoTerceiroService servicos;

    ServicoTerceiroController(IdentificacaoDoUsuario identificacao, ServicoTerceiroService servicos) {
        this.identificacao = identificacao;
        this.servicos = servicos;
    }

    @GetMapping("/api/fornecedores")
    @Operation(
            summary = "Listar fornecedores credenciados",
            description = "Organizações ativas do tipo FORNECEDOR. Perfis: ADMIN, ATENDENTE e DEPARTAMENTO.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    List<FornecedorResponse> fornecedores() {
        return servicos.fornecedores();
    }

    @PostMapping("/api/chamados/{codigo}/servicos")
    @Operation(
            summary = "Acionar serviço terceirizado",
            description = "Só para chamado já triado e sem outro serviço em andamento; senão a resposta é 409. Perfis: ADMIN, ATENDENTE "
                    + "e DEPARTAMENTO (só a própria fila).",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ResponseEntity<ChamadoResponse> vincular(
            @PathVariable String codigo,
            @Valid @RequestBody VinculoDeServicoRequest request,
            @AuthenticationPrincipal Jwt token
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(servicos.vincular(codigo, request, identificacao.de(token)));
    }

    @DeleteMapping("/api/chamados/{codigo}/servicos/{servicoId}")
    @Operation(
            summary = "Cancelar serviço terceirizado",
            description = "Perfis: ADMIN, ATENDENTE e DEPARTAMENTO (só a própria fila).",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ResponseEntity<Void> cancelar(@PathVariable String codigo, @PathVariable UUID servicoId, @AuthenticationPrincipal Jwt token) {
        servicos.cancelar(codigo, servicoId, identificacao.de(token));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/fornecedor/servicos")
    @Operation(
            summary = "Listar os serviços do fornecedor autenticado",
            description = "Serviços ativos da organização do fornecedor, sem dados pessoais do cliente. Chamados na lixeira não "
                    + "aparecem. Perfil: FORNECEDOR.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    List<ServicoDoFornecedorResponse> doFornecedor(@AuthenticationPrincipal Jwt token) {
        return servicos.doFornecedor(identificacao.de(token));
    }

    @PatchMapping("/api/fornecedor/servicos/{id}/status")
    @Operation(
            summary = "Atualizar o status de um serviço pelo fornecedor",
            description = "O status só avança: Recebido, Em execução e Concluído, podendo pular etapas. Voltar ou repetir o status atual "
                    + "responde 409, e Concluído é final. Serviço de chamado na lixeira responde 404. O cliente é notificado. "
                    + "Perfil: FORNECEDOR.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ServicoDoFornecedorResponse atualizar(
            @PathVariable UUID id,
            @Valid @RequestBody AtualizacaoDeServicoRequest request,
            @AuthenticationPrincipal Jwt token
    ) {
        return servicos.atualizarPeloFornecedor(id, request, identificacao.de(token));
    }
}
