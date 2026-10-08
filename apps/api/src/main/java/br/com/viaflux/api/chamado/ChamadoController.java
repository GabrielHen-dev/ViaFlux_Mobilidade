package br.com.viaflux.api.chamado;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/chamados")
@Tag(name = "Chamados", description = "Abertura e acompanhamento de chamados")
public class ChamadoController {

    private final ChamadoService chamadoService;

    ChamadoController(ChamadoService chamadoService) {
        this.chamadoService = chamadoService;
    }

    @PostMapping
    @Operation(summary = "Abrir chamado", description = "Registra um novo chamado com status inicial ABERTO.")
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

    @GetMapping("/{id}")
    @Operation(summary = "Consultar chamado", description = "Retorna os dados de um chamado pelo seu identificador.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Chamado encontrado"),
            @ApiResponse(responseCode = "404", description = "Chamado não encontrado")
    })
    public ChamadoResponse consultar(@PathVariable UUID id) {
        return chamadoService.consultar(id);
    }
}
