package br.com.viaflux.api.devtools;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dev")
@ConditionalOnProperty(prefix = "viaflux.dev-tools", name = "habilitado", havingValue = "true")
@Tag(name = "Dev tools", description = "Somente em desenvolvimento: popular e limpar dados de exemplo. Restrito a ADMIN.")
class DevToolsController {

    private static final int QUANTIDADE_PADRAO_DE_CHAMADOS = 30;

    record PopularRequest(
            @Min(value = 1, message = "Crie pelo menos 1 chamado.")
            @Max(value = 200, message = "Crie no máximo 200 chamados por vez.")
            Integer quantidadeDeChamados
    ) {
    }

    private final PopuladorDeDados populador;

    DevToolsController(PopuladorDeDados populador) {
        this.populador = populador;
    }

    @GetMapping("/estado")
    @Operation(
            summary = "Consultar dados de exemplo",
            description = "Só existe com DEV_TOOLS_HABILITADO=true. Perfil: ADMIN.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    PopuladorDeDados.EstadoDosDados estado() {
        return populador.estado();
    }

    @PostMapping("/seed")
    @Operation(
            summary = "Popular o banco com usuários, organizações e chamados de exemplo",
            description = "Cria usuários *@seed.viaflux.local com a senha DEV_TOOLS_SENHA e chamados em todas as etapas, parte deles na "
                    + "fila de triagem. Só existe com DEV_TOOLS_HABILITADO=true. Perfil: ADMIN.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    PopuladorDeDados.ResultadoDoSeed popular(@Valid @RequestBody(required = false) PopularRequest requisicao) {
        int quantidade = requisicao == null || requisicao.quantidadeDeChamados() == null
                ? QUANTIDADE_PADRAO_DE_CHAMADOS
                : requisicao.quantidadeDeChamados();
        return populador.popular(quantidade);
    }

    @DeleteMapping("/dados-de-exemplo")
    @Operation(
            summary = "Apagar os chamados, usuários e organizações de exemplo",
            description = "Só existe com DEV_TOOLS_HABILITADO=true. Perfil: ADMIN.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    PopuladorDeDados.ResultadoDaLimpeza limpar() {
        return populador.limpar();
    }

    @DeleteMapping("/banco")
    @Operation(
            summary = "Apagar todos os dados, exceto os usuários ADMIN",
            description = "Remove todos os chamados, os usuários sem perfil ADMIN e as organizações sem usuários, e reinicia a numeração "
                    + "dos protocolos. Catálogos, regras e feriados são mantidos. Só existe com DEV_TOOLS_HABILITADO=true. Perfil: ADMIN.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    PopuladorDeDados.ResultadoDaLimpezaGeral apagarTudo() {
        return populador.apagarTudoExcetoAdministradores();
    }

    @ExceptionHandler(DevToolsIndisponivelException.class)
    ProblemDetail devToolsIndisponivel(DevToolsIndisponivelException excecao) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, excecao.getMessage());
    }
}
