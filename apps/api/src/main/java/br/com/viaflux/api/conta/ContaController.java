package br.com.viaflux.api.conta;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@Tag(name = "Conta", description = "Cadastro do cliente, verificação de e-mail e recuperação de senha")
class ContaController {

    static final String INSTRUCOES_ENVIADAS = "Se os dados estiverem corretos, enviamos as instruções para o seu e-mail.";

    record CadastroRequest(
            @NotBlank(message = "Informe seu nome.")
            @Size(max = 150, message = "O nome deve ter no máximo 150 caracteres.")
            String nome,

            @NotBlank(message = "Informe o e-mail.")
            @Email(message = "Informe um e-mail válido.")
            @Size(max = 254, message = "O e-mail deve ter no máximo 254 caracteres.")
            String email,

            @NotBlank(message = "Crie uma senha.")
            @Size(min = 8, max = 72, message = "A senha deve ter entre 8 e 72 caracteres.")
            String senha,

            @Size(max = 30, message = "O telefone deve ter no máximo 30 caracteres.")
            String telefone,

            @AssertTrue(message = "É preciso aceitar os termos de uso e a política de privacidade.")
            boolean aceiteDosTermos
    ) {
    }

    record EmailRequest(
            @NotBlank(message = "Informe o e-mail.")
            @Email(message = "Informe um e-mail válido.")
            @Size(max = 254, message = "O e-mail deve ter no máximo 254 caracteres.")
            String email
    ) {
    }

    record TokenRequest(@NotBlank(message = "O link está incompleto.") @Size(max = 200) String token) {
    }

    record RedefinicaoRequest(
            @NotBlank(message = "O link está incompleto.") @Size(max = 200) String token,

            @NotBlank(message = "Crie uma senha.")
            @Size(min = 8, max = 72, message = "A senha deve ter entre 8 e 72 caracteres.")
            String senha
    ) {
    }

    record MensagemResponse(String mensagem) {
    }

    private final ContaService contas;

    ContaController(ContaService contas) {
        this.contas = contas;
    }

    @PostMapping("/cadastro")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(
            summary = "Criar conta de cliente",
            description = "Público. Cria uma conta CLIENTE sem organização e envia o link de verificação por e-mail (válido por "
                    + "24 h). A resposta é a mesma se o e-mail já estiver cadastrado; nesse caso o dono recebe um aviso. "
                    + "Limite de tentativas por e-mail e por origem (429)."
    )
    MensagemResponse cadastrar(@Valid @RequestBody CadastroRequest pedido, HttpServletRequest requisicao) {
        contas.cadastrar(pedido, requisicao.getRemoteAddr());
        return new MensagemResponse("Conta recebida. " + INSTRUCOES_ENVIADAS);
    }

    @PostMapping("/verificacao")
    @Operation(
            summary = "Confirmar o e-mail",
            description = "Público. Usa o token do link de verificação, que é de uso único. Token inválido, usado ou expirado "
                    + "responde 400."
    )
    MensagemResponse confirmar(@Valid @RequestBody TokenRequest pedido) {
        contas.confirmarEmail(pedido.token());
        return new MensagemResponse("E-mail confirmado. Você já pode abrir chamados.");
    }

    @PostMapping("/verificacao/reenvio")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(
            summary = "Reenviar o link de verificação",
            description = "Público. Gera um link novo e invalida o anterior, se a conta existir e ainda não estiver verificada. "
                    + "A resposta não revela se o e-mail está cadastrado."
    )
    MensagemResponse reenviar(@Valid @RequestBody EmailRequest pedido, HttpServletRequest requisicao) {
        contas.reenviarVerificacao(pedido.email(), requisicao.getRemoteAddr());
        return new MensagemResponse(INSTRUCOES_ENVIADAS);
    }

    @PostMapping("/senha/recuperacao")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(
            summary = "Pedir redefinição de senha",
            description = "Público. Envia um link de redefinição válido por 30 min, de uso único, se houver conta ativa com o "
                    + "e-mail. Um pedido novo invalida o link anterior. A resposta não revela se o e-mail está cadastrado."
    )
    MensagemResponse recuperar(@Valid @RequestBody EmailRequest pedido, HttpServletRequest requisicao) {
        contas.solicitarRedefinicao(pedido.email(), requisicao.getRemoteAddr());
        return new MensagemResponse(INSTRUCOES_ENVIADAS);
    }

    @PostMapping("/senha/redefinicao")
    @Operation(
            summary = "Definir uma senha nova",
            description = "Público. Usa o token do link de redefinição. Troca a senha, encerra todas as sessões abertas e avisa o "
                    + "dono da conta por e-mail. Token inválido, usado ou expirado responde 400."
    )
    MensagemResponse redefinir(@Valid @RequestBody RedefinicaoRequest pedido) {
        contas.redefinirSenha(pedido.token(), pedido.senha());
        return new MensagemResponse("Senha alterada. Entre com a senha nova.");
    }
}
