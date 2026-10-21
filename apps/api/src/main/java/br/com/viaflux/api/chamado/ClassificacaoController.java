package br.com.viaflux.api.chamado;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

@RestController
@Tag(name = "Classificação", description = "Matriz de motivos, contextos e departamentos")
class ClassificacaoController {

    private final MotivoRepository motivos;
    private final ContextoRepository contextos;

    ClassificacaoController(MotivoRepository motivos, ContextoRepository contextos) {
        this.motivos = motivos;
        this.contextos = contextos;
    }

    @GetMapping("/api/classificacao/motivos")
    @Transactional(readOnly = true)
    @Operation(
            summary = "Listar motivos de abertura",
            description = "Matriz de 30 motivos, 5 por departamento, com a severidade de cada um. Qualquer usuário autenticado.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    List<MotivoResponse> motivos() {
        return motivos.findAllByOrderByTipoAscOrdemAsc().stream().map(MotivoResponse::de).toList();
    }

    @GetMapping("/api/classificacao/contextos")
    @Transactional(readOnly = true)
    @Operation(
            summary = "Listar contextos situacionais",
            description = "Contextos do tipo informado, com a urgência que define o prazo de triagem (alta 10 min, média 20 min, baixa "
                    + "40 min). Qualquer usuário autenticado.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    List<ContextoResponse> contextos(@RequestParam(required = false) String tipo) {
        List<Contexto> lista = tipo == null || tipo.isBlank()
                ? contextos.findAllByOrderByTipoAscOrdemAsc()
                : contextos.findByTipoOrderByOrdemAsc(tipoValido(tipo));
        return lista.stream().map(ContextoResponse::de).toList();
    }

    @GetMapping("/api/departamentos")
    @Operation(
            summary = "Listar departamentos atendentes",
            description = "Qualquer usuário autenticado.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    List<DepartamentoResponse> departamentos() {
        return Arrays.stream(TipoChamado.values()).map(DepartamentoResponse::de).toList();
    }

    private static TipoChamado tipoValido(String tipo) {
        try {
            return TipoChamado.valueOf(tipo.trim());
        } catch (IllegalArgumentException erro) {
            throw new FiltroChamadoInvalidoException("O tipo informado não é válido.");
        }
    }
}
