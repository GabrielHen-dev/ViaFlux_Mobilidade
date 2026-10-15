package br.com.viaflux.api.usuario;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.UUID;

@RestController
@Validated
@RequestMapping("/api/admin")
class UsuarioAdminController {

    private final UsuarioAdminService service;

    UsuarioAdminController(UsuarioAdminService service) {
        this.service = service;
    }

    @GetMapping("/usuarios/opcoes")
    UsuarioAdminOpcoesResponse opcoes() {
        return service.opcoes();
    }

    @GetMapping("/usuarios")
    UsuariosAdminPageResponse listar(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    ) {
        return service.listar(page, size);
    }

    @GetMapping("/usuarios/{id}")
    UsuarioAdminResponse consultar(@PathVariable UUID id) {
        return service.consultar(id);
    }

    @PostMapping("/usuarios")
    ResponseEntity<UsuarioAdminResponse> criar(@Valid @RequestBody CriarUsuarioRequest request) {
        UsuarioAdminResponse response = service.criar(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/usuarios/{id}")
    UsuarioAdminResponse atualizar(@PathVariable UUID id, @Valid @RequestBody AtualizarUsuarioRequest request) {
        return service.atualizar(id, request);
    }

    @PatchMapping("/usuarios/{id}/ativo")
    UsuarioAdminResponse alterarAtivo(
            @PathVariable UUID id,
            @Valid @RequestBody AlterarAtivoRequest request,
            @AuthenticationPrincipal Jwt token
    ) {
        return service.alterarAtivo(id, request.ativo(), UUID.fromString(token.getSubject()));
    }

    @PostMapping("/organizacoes")
    ResponseEntity<UsuarioResponse.OrganizacaoResponse> criarOrganizacao(
            @Valid @RequestBody CriarOrganizacaoRequest request
    ) {
        UsuarioResponse.OrganizacaoResponse response = service.criarOrganizacao(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }
}
