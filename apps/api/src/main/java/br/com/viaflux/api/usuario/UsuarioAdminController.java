package br.com.viaflux.api.usuario;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.UUID;

@RestController
@Validated
@RequestMapping("/api/admin")
@Tag(name = "Gestão de usuários", description = "Cadastro de usuários e organizações. Perfil: ADMIN.")
class UsuarioAdminController {

    private final UsuarioAdminService service;

    UsuarioAdminController(UsuarioAdminService service) {
        this.service = service;
    }

    @GetMapping("/usuarios/opcoes")
    @Operation(
            summary = "Opções do cadastro de usuários",
            description = "Perfis, departamentos e organizações disponíveis para montar o formulário de cadastro. Perfil: ADMIN.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    UsuarioAdminOpcoesResponse opcoes() {
        return service.opcoes();
    }

    @GetMapping("/usuarios")
    @Operation(
            summary = "Listar usuários",
            description = "Lista paginada (page a partir de 0, size de 1 a 100), com perfis, organização, departamentos e situação. "
                    + "Perfil: ADMIN.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    UsuariosAdminPageResponse listar(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    ) {
        return service.listar(page, size);
    }

    @GetMapping("/usuarios/{id}")
    @Operation(
            summary = "Consultar usuário",
            description = "Perfil: ADMIN.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    UsuarioAdminResponse consultar(@PathVariable UUID id) {
        return service.consultar(id);
    }

    @PostMapping("/usuarios")
    @Operation(
            summary = "Convidar usuário",
            description = "Cria o usuário com o convite pendente e envia por e-mail o link para ele definir a própria senha "
                    + "(validade configurável, padrão de 7 dias). Até aceitar o convite, o usuário não consegue entrar. "
                    + "Regras: e-mail único (409 se já existir); DEPARTAMENTO exige ao menos um departamento ativo; CLIENTE e "
                    + "GESTOR_FROTA exigem organização do tipo CLIENTE; FORNECEDOR exige organização do tipo FORNECEDOR; um usuário "
                    + "não pode ser cliente e fornecedor ao mesmo tempo; a organização precisa estar ativa. Perfil: ADMIN.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ResponseEntity<UsuarioAdminResponse> criar(
            @Valid @RequestBody CriarUsuarioRequest request,
            @AuthenticationPrincipal Jwt token
    ) {
        UsuarioAdminResponse response = service.criar(request, idDo(token));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/usuarios/{id}")
    @Operation(
            summary = "Atualizar usuário",
            description = "Regras: e-mail único (409 se já existir); DEPARTAMENTO exige ao menos um departamento ativo; CLIENTE e "
                    + "GESTOR_FROTA exigem organização do tipo CLIENTE; FORNECEDOR exige organização do tipo FORNECEDOR; um usuário "
                    + "não pode ser cliente e fornecedor ao mesmo tempo; a organização precisa estar ativa. Também não é possível "
                    + "tirar o perfil do último ADMIN ativo. Se o convite estiver pendente e o e-mail mudar, um convite novo "
                    + "é enviado para o endereço atualizado. Perfil: ADMIN.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    UsuarioAdminResponse atualizar(
            @PathVariable UUID id,
            @Valid @RequestBody AtualizarUsuarioRequest request,
            @AuthenticationPrincipal Jwt token
    ) {
        return service.atualizar(id, request, idDo(token));
    }

    @PostMapping("/usuarios/{id}/convite")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(
            summary = "Reenviar convite",
            description = "Envia um link de convite novo e invalida o anterior. Só vale para usuário ativo com convite pendente: "
                    + "409 se o acesso já foi ativado, 400 se o usuário estiver inativo. Perfil: ADMIN.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    UsuarioAdminResponse reenviarConvite(@PathVariable UUID id, @AuthenticationPrincipal Jwt token) {
        return service.reenviarConvite(id, idDo(token));
    }

    @PatchMapping("/usuarios/{id}/ativo")
    @Operation(
            summary = "Ativar ou desativar usuário",
            description = "Usuário inativo não consegue entrar nem renovar a sessão. Não é possível desativar a própria conta nem o "
                    + "último ADMIN ativo. Perfil: ADMIN.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    UsuarioAdminResponse alterarAtivo(
            @PathVariable UUID id,
            @Valid @RequestBody AlterarAtivoRequest request,
            @AuthenticationPrincipal Jwt token
    ) {
        return service.alterarAtivo(id, request.ativo(), idDo(token));
    }

    @PostMapping("/organizacoes")
    @Operation(
            summary = "Cadastrar organização",
            description = "Cria uma organização do tipo CLIENTE (empresa cliente) ou FORNECEDOR (oficina, guincho e outros prestadores). "
                    + "Perfil: ADMIN.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
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

    private static UUID idDo(Jwt token) {
        return token == null ? null : UUID.fromString(token.getSubject());
    }
}
