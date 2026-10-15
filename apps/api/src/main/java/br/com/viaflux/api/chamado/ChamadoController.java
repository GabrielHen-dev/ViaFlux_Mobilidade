package br.com.viaflux.api.chamado;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.Set;
import java.util.UUID;

@RestController
@Validated
@RequestMapping("/api/chamados")
@Tag(name = "Chamados", description = "Abertura e acompanhamento de chamados")
public class ChamadoController {

    private static final Set<String> PERFIS_COM_ACESSO_GLOBAL = Set.of(
            "ADMIN", "ATENDENTE", "LIDER_OPERACIONAL"
    );

    private final ChamadoService chamadoService;

    ChamadoController(ChamadoService chamadoService) {
        this.chamadoService = chamadoService;
    }

    @PostMapping
    @Operation(
            summary = "Abrir chamado",
            description = "Disponível para CLIENTE e GESTOR_FROTA. O solicitante é identificado pelo token autenticado.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Chamado aberto com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "401", description = "Token ausente ou inválido"),
            @ApiResponse(responseCode = "403", description = "Perfil sem permissão para abrir chamados")
    })
    public ResponseEntity<ChamadoResponse> abrir(
            @Valid @RequestBody AbrirChamadoRequest request,
            @AuthenticationPrincipal Jwt token
    ) {
        UUID solicitanteId = token == null ? null : UUID.fromString(token.getSubject());
        ChamadoResponse chamado = chamadoService.abrir(request, solicitanteId);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(chamado.id())
                .toUri();
        return ResponseEntity.created(location).body(chamado);
    }

    @GetMapping
    @Operation(
            summary = "Listar chamados",
            description = "CLIENTE/GESTOR_FROTA recebem apenas os próprios chamados; ADMIN, ATENDENTE e LIDER_OPERACIONAL podem listar todos.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Página de chamados retornada"),
            @ApiResponse(responseCode = "400", description = "Filtros ou paginação inválidos"),
            @ApiResponse(responseCode = "401", description = "Token ausente ou inválido"),
            @ApiResponse(responseCode = "403", description = "Perfil sem permissão para consultar chamados")
    })
    public ChamadosPageResponse listar(
            @Parameter(description = "Busca por código público, cliente ou modelo do veículo")
            @RequestParam(required = false) String busca,
            @Parameter(description = "Rótulo do status, por exemplo: Aberto ou Em atendimento")
            @RequestParam(required = false) String status,
            @Parameter(description = "Prioridade: Baixa, Média, Alta ou Crítica")
            @RequestParam(required = false) String prioridade,
            @Parameter(description = "Página baseada em zero")
            @Min(0) @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Quantidade por página, entre 1 e 100")
            @Min(1) @Max(100) @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal Jwt token
    ) {
        UUID solicitanteId = UUID.fromString(token.getSubject());
        boolean acessoGlobal = temAcessoGlobal(token);
        return chamadoService.listar(busca, status, prioridade, page, size, solicitanteId, acessoGlobal);
    }

    @GetMapping("/resumo")
    @Operation(
            summary = "Consultar resumo dos chamados",
            description = "Disponível para ADMIN, ATENDENTE e LIDER_OPERACIONAL.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Resumo dos chamados retornado"),
            @ApiResponse(responseCode = "401", description = "Token ausente ou inválido"),
            @ApiResponse(responseCode = "403", description = "Perfil sem permissão para consultar o resumo")
    })
    public ChamadosResumoResponse resumir() {
        return chamadoService.resumir();
    }

    @GetMapping("/{codigo}")
    @Operation(
            summary = "Consultar chamado",
            description = "CLIENTE/GESTOR_FROTA recebem apenas os próprios chamados; ADMIN, ATENDENTE e LIDER_OPERACIONAL podem consultar todos.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Chamado encontrado"),
            @ApiResponse(responseCode = "404", description = "Chamado não encontrado ou não acessível para este usuário"),
            @ApiResponse(responseCode = "401", description = "Token ausente ou inválido"),
            @ApiResponse(responseCode = "403", description = "Perfil sem permissão para consultar chamados")
    })
    public ChamadoResponse consultar(
            @PathVariable("codigo") String codigo,
            @AuthenticationPrincipal Jwt token
    ) {
        UUID solicitanteId = UUID.fromString(token.getSubject());
        boolean acessoGlobal = temAcessoGlobal(token);
        return chamadoService.consultar(codigo, solicitanteId, acessoGlobal);
    }

    private static boolean temAcessoGlobal(Jwt token) {
        var perfis = token.getClaimAsStringList("perfis");
        return perfis != null && perfis.stream().anyMatch(PERFIS_COM_ACESSO_GLOBAL::contains);
    }
}
