package br.com.viaflux.api.chamado;


import br.com.viaflux.api.chamado.atendimento.AtendimentoService;
import br.com.viaflux.api.usuario.IdentificacaoDoUsuario;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/chamados/{codigo}/mensagens")
@Tag(name = "Conversa", description = "Chat do chamado entre o solicitante e a equipe")
public class ConversaController {

    private final IdentificacaoDoUsuario identificacao;
    private final ConversaDoChamadoService conversa;
    private final AtendimentoService atendimento;

    public ConversaController(IdentificacaoDoUsuario identificacao, ConversaDoChamadoService conversa, AtendimentoService atendimento) {
        this.identificacao = identificacao;
        this.conversa = conversa;
        this.atendimento = atendimento;
    }

    @GetMapping
    @Operation(
            summary = "Consultar a conversa do chamado",
            description = "Mensagens em ordem cronológica e até onde o usuário já leu. Cliente e gestor de frota não recebem as notas "
                    + "internas. Quem pode ver o chamado pode consultar; o envio usa POST /api/chamados/{codigo}/atualizacoes.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    public ConversaResponse consultar(@PathVariable String codigo, @AuthenticationPrincipal Jwt token) {
        return conversa.consultar(codigo, identificacao.de(token));
    }

    @PostMapping(value = "/arquivo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Enviar arquivo na conversa do chamado",
            description = "Grava o arquivo e a mensagem na mesma operação. Campos: arquivo, texto (opcional) e visivelCliente, que define se o "
                    + "arquivo é visível ao solicitante; o de cliente e gestor de frota é sempre visível. O header Idempotency-Key é opcional. "
                    + "Mesmas permissões, limites e bloqueio de chamado fechado do envio de mensagem.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    public ResponseEntity<ChamadoResponse> enviarArquivo(
            @PathVariable String codigo,
            @RequestParam(name = "arquivo", required = false) MultipartFile arquivo,
            @RequestParam(name = "texto", required = false) String texto,
            @RequestParam(name = "visivelCliente", defaultValue = "false") boolean visivelCliente,
            @RequestHeader(name = "Idempotency-Key", required = false) String chaveIdempotencia,
            @AuthenticationPrincipal Jwt token
    ) {
        ChamadoResponse chamado = atendimento.enviarArquivoNaConversa(codigo, arquivo, texto, visivelCliente, chaveIdempotencia, identificacao.de(token));
        return ResponseEntity.status(HttpStatus.CREATED).body(chamado);
    }

    @PostMapping("/leitura")
    @Operation(
            summary = "Marcar a conversa como lida",
            description = "Avança o ponto de leitura do usuário e conclui as notificações de mensagem deste chamado, o que cancela o "
                    + "e-mail ainda não enviado. Quem pode ver o chamado pode marcar.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    public ResponseEntity<Void> marcarComoLida(@PathVariable String codigo, @Valid @RequestBody LeituraDaConversaRequest request,
                                        @AuthenticationPrincipal Jwt token) {
        conversa.marcarComoLida(codigo, request.ate(), identificacao.de(token));
        return ResponseEntity.noContent().build();
    }
}
