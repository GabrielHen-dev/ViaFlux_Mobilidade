package br.com.viaflux.api.conta;

import br.com.viaflux.api.shared.config.SecurityConfig;
import br.com.viaflux.api.shared.error.ApiExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.never;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ContaController.class)
@Import({SecurityConfig.class, ApiExceptionHandler.class})
class ContaControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ContaService contas;

    @Test
    void cadastroEhPublicoERespondeSemRevelarSeOEmailExiste() throws Exception {
        mockMvc.perform(post("/auth/cadastro")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Ana Cliente","email":"ana@exemplo.com","senha":"senha-forte-1","telefone":"(85) 99999-0000","aceiteDosTermos":true}
                                """))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.mensagem").value("Conta recebida. " + ContaController.INSTRUCOES_ENVIADAS));
        then(contas).should().cadastrar(eq(new ContaController.CadastroRequest(
                "Ana Cliente", "ana@exemplo.com", "senha-forte-1", "(85) 99999-0000", true)), anyString());
    }

    @Test
    void cadastroExigeAceiteDosTermosESenhaDeOitoCaracteres() throws Exception {
        mockMvc.perform(post("/auth/cadastro")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"","email":"nao-e-email","senha":"curta","aceiteDosTermos":false}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.nome").value("Informe seu nome."))
                .andExpect(jsonPath("$.errors.email").value("Informe um e-mail válido."))
                .andExpect(jsonPath("$.errors.senha").value("A senha deve ter entre 8 e 72 caracteres."))
                .andExpect(jsonPath("$.errors.aceiteDosTermos").value("É preciso aceitar os termos de uso e a política de privacidade."));
        then(contas).should(never()).cadastrar(any(), anyString());
    }

    @Test
    void recuperacaoEReenvioRespondemSempreDaMesmaForma() throws Exception {
        for (String rota : new String[]{"/auth/senha/recuperacao", "/auth/verificacao/reenvio"}) {
            mockMvc.perform(post(rota).contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"ninguem@exemplo.com\"}"))
                    .andExpect(status().isAccepted())
                    .andExpect(jsonPath("$.mensagem").value(ContaController.INSTRUCOES_ENVIADAS));
        }
    }

    @Test
    void verificacaoComLinkInvalidoResponde400() throws Exception {
        willThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, ContaService.LINK_INVALIDO)).given(contas).confirmarEmail("velho");

        mockMvc.perform(post("/auth/verificacao").contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"velho\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(ContaService.LINK_INVALIDO));
    }

    @Test
    void redefinicaoDeSenhaEhPublicaEValidaASenhaNova() throws Exception {
        mockMvc.perform(post("/auth/senha/redefinicao").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"abc\",\"senha\":\"senha-nova-2\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensagem").value("Senha alterada. Entre com a senha nova."));
        then(contas).should().redefinirSenha("abc", "senha-nova-2");

        mockMvc.perform(post("/auth/senha/redefinicao").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"abc\",\"senha\":\"123\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void excessoDeTentativasResponde429() throws Exception {
        willThrow(new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Muitas tentativas seguidas. Tente de novo em 15 minutos."))
                .given(contas).solicitarRedefinicao(eq("ana@exemplo.com"), anyString());

        mockMvc.perform(post("/auth/senha/recuperacao").contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"ana@exemplo.com\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.detail").value("Muitas tentativas seguidas. Tente de novo em 15 minutos."));
    }
}
