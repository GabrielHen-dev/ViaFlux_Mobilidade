package br.com.viaflux.api.usuario;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/solicitantes")
@Tag(name = "Solicitantes", description = "Clientes que a Central pode indicar ao abrir um chamado")
class SolicitanteController {

    private static final Set<String> PERFIS_DE_SOLICITANTE = Set.of("CLIENTE", "GESTOR_FROTA");
    private static final int LIMITE_DE_RESULTADOS = 50;

    record SolicitanteResponse(UUID id, String nome, String email, String organizacao) {
    }

    private final UsuarioRepository usuarios;

    SolicitanteController(UsuarioRepository usuarios) {
        this.usuarios = usuarios;
    }

    @GetMapping
    @Transactional(readOnly = true)
    @Operation(
            summary = "Buscar clientes solicitantes",
            description = "Disponível para ADMIN e ATENDENTE. Lista usuários ativos com perfil CLIENTE ou GESTOR_FROTA.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    List<SolicitanteResponse> buscar(
            @Parameter(description = "Trecho do nome ou do e-mail")
            @RequestParam(required = false) String busca
    ) {
        String termo = "%" + (busca == null ? "" : busca.trim().toLowerCase(Locale.ROOT)) + "%";
        return usuarios.buscarAtivosComPerfis(PERFIS_DE_SOLICITANTE, termo, PageRequest.of(0, LIMITE_DE_RESULTADOS)).stream()
                .map(usuario -> new SolicitanteResponse(
                        usuario.getId(),
                        usuario.getNome(),
                        usuario.getEmail(),
                        usuario.getOrganizacao() == null ? null : usuario.getOrganizacao().getNome()
                ))
                .toList();
    }
}
