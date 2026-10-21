package br.com.viaflux.api.chamado;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/metricas")
@Tag(name = "Métricas", description = "Indicadores para a liderança operacional")
class MetricasController {

    private static final MediaType CSV = new MediaType("text", "csv", StandardCharsets.UTF_8);

    private final MetricasService metricas;

    MetricasController(MetricasService metricas) {
        this.metricas = metricas;
    }

    @GetMapping
    @Operation(
            summary = "Consultar indicadores do período",
            description = "Período obrigatório em de e ate (AAAA-MM-DD). Filtros opcionais: prioridade, tipo, departamento e fornecedor. "
                    + "Indicadores ainda sem fonte de dados vêm marcados como pendentes de levantamento. Perfis: ADMIN e "
                    + "LIDER_OPERACIONAL.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    MetricasResponse consultar(
            @RequestParam(required = false) String de,
            @RequestParam(required = false) String ate,
            @RequestParam(required = false) String prioridade,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String departamento,
            @RequestParam(required = false) String fornecedor
    ) {
        return metricas.consultar(FiltrosDeMetricas.de(de, ate, prioridade, tipo, departamento, fornecedor));
    }

    @GetMapping("/exportacao")
    @Operation(
            summary = "Exportar os chamados do período em CSV",
            description = "CSV separado por ponto e vírgula, um chamado por linha, com os mesmos filtros da consulta. Perfis: ADMIN e "
                    + "LIDER_OPERACIONAL.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ResponseEntity<String> exportar(
            @RequestParam(required = false) String de,
            @RequestParam(required = false) String ate,
            @RequestParam(required = false) String prioridade,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String departamento,
            @RequestParam(required = false) String fornecedor
    ) {
        FiltrosDeMetricas filtros = FiltrosDeMetricas.de(de, ate, prioridade, tipo, departamento, fornecedor);
        return ResponseEntity.ok()
                .contentType(CSV)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"metricas-" + filtros.de() + "-a-" + filtros.ate() + ".csv\"")
                .body(metricas.exportar(filtros));
    }
}
