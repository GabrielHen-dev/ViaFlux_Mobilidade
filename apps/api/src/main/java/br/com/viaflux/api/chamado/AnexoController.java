package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.IdentificacaoDoUsuario;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@RestController
@RequestMapping("/api/chamados/{codigo}/anexos")
@Tag(name = "Anexos", description = "Fotos e documentos do chamado")
class AnexoController {

    private final IdentificacaoDoUsuario identificacao;
    private final AnexoService anexos;

    AnexoController(IdentificacaoDoUsuario identificacao, AnexoService anexos) {
        this.identificacao = identificacao;
        this.anexos = anexos;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Enviar anexo (PNG, JPG ou PDF)",
            description = "Multipart com o campo arquivo, até o limite de ANEXO_LIMITE_MB. O header Idempotency-Key é opcional e vale "
                    + "por usuário: reenviar com a mesma chave devolve o anexo já guardado (200). Perfis: ADMIN, ATENDENTE, "
                    + "DEPARTAMENTO (só a própria fila), CLIENTE e GESTOR_FROTA (só o próprio chamado). LIDER_OPERACIONAL só "
                    + "acompanha.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ResponseEntity<AnexoResponse> enviar(
            @PathVariable String codigo,
            @RequestParam(name = "arquivo", required = false) MultipartFile arquivo,
            @RequestHeader(name = "Idempotency-Key", required = false) String chaveIdempotencia,
            @AuthenticationPrincipal Jwt token
    ) {
        AnexoService.Resultado resultado = anexos.enviar(codigo, arquivo, chaveIdempotencia, identificacao.de(token));
        return ResponseEntity.status(resultado.criado() ? HttpStatus.CREATED : HttpStatus.OK).body(resultado.anexo());
    }

    @GetMapping("/{anexoId}/conteudo")
    @Operation(
            summary = "Baixar o conteúdo de um anexo",
            description = "O arquivo é exibido inline. Quem pode ver o chamado pode baixar os anexos.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ResponseEntity<InputStreamResource> baixar(@PathVariable String codigo, @PathVariable UUID anexoId, @AuthenticationPrincipal Jwt token) {
        AnexoService.Conteudo conteudo = anexos.abrir(codigo, anexoId, identificacao.de(token));
        ContentDisposition disposicao = ContentDisposition.inline().filename(conteudo.nome(), StandardCharsets.UTF_8).build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(conteudo.tipoConteudo()))
                .contentLength(conteudo.tamanho())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposicao.toString())
                .body(new InputStreamResource(conteudo.dados()));
    }
}
