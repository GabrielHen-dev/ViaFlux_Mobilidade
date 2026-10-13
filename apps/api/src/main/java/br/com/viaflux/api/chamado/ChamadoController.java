package br.com.viaflux.api.chamado;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.ResponseEntity;
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

@RestController
@Validated
@RequestMapping("/api/chamados")
@Tag(name = "Chamados", description = "Abertura e acompanhamento de chamados")
public class ChamadoController {

    private final ChamadoService chamadoService;

    ChamadoController(ChamadoService chamadoService) {
        this.chamadoService = chamadoService;
    }

    @PostMapping
    @Operation(summary = "Abrir chamado", description = "Registra um novo chamado com status inicial Aberto e prioridade Média.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Chamado aberto com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos")
    })
    public ResponseEntity<ChamadoResponse> abrir(@Valid @RequestBody AbrirChamadoRequest request) {
        ChamadoResponse chamado = chamadoService.abrir(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(chamado.id())
                .toUri();
        return ResponseEntity.created(location).body(chamado);
    }

    @GetMapping
    @Operation(summary = "Listar chamados", description = "Lista chamados com filtros opcionais e paginação, ordenados dos mais recentes para os mais antigos.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Página de chamados retornada"),
            @ApiResponse(responseCode = "400", description = "Filtros ou paginação inválidos")
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
            @Min(1) @Max(100) @RequestParam(defaultValue = "20") int size
    ) {
        return chamadoService.listar(busca, status, prioridade, page, size);
    }

    @GetMapping("/{codigo}")
    @Operation(summary = "Consultar chamado", description = "Retorna os dados de um chamado pelo código público.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Chamado encontrado"),
            @ApiResponse(responseCode = "404", description = "Chamado não encontrado")
    })
    public ChamadoResponse consultar(@PathVariable("codigo") String codigo) {
        return chamadoService.consultar(codigo);
    }
}
