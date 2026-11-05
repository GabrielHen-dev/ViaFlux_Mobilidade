package br.com.viaflux.api.chamado;


import br.com.viaflux.api.chamado.atendimento.AtendimentoService;
import br.com.viaflux.api.shared.config.SecurityConfig;
import br.com.viaflux.api.shared.error.ApiExceptionHandler;
import br.com.viaflux.api.usuario.IdentificacaoDoUsuario;
import br.com.viaflux.api.usuario.UsuarioAtual;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ConversaController.class)
@Import({SecurityConfig.class, ApiExceptionHandler.class})
class ConversaControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IdentificacaoDoUsuario identificacao;

    @MockitoBean
    private ConversaDoChamadoService conversa;

    @MockitoBean
    private AtendimentoService atendimento;

    @Test
    void exigeAutenticacao() throws Exception {
        mockMvc.perform(get("/api/chamados/VF-0001/mensagens")).andExpect(status().isUnauthorized());
    }

    @Test
    void fornecedorNaoAcessaAConversa() throws Exception {
        mockMvc.perform(get("/api/chamados/VF-0001/mensagens").with(autenticado(usuario("FORNECEDOR"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void devolveAsMensagensEOPontoDeLeitura() throws Exception {
        UsuarioAtual ana = usuario("CLIENTE");
        OffsetDateTime instante = OffsetDateTime.parse("2026-11-04T10:00:00-03:00");
        MensagemResponse mensagem = new MensagemResponse(UUID.randomUUID(), "Guincho a caminho", new Autor(UUID.randomUUID(), "Bruna"),
                instante, true, OrigemDaMensagem.EQUIPE, null);
        given(conversa.consultar("VF-0001", ana)).willReturn(new ConversaResponse(List.of(mensagem), instante));

        mockMvc.perform(get("/api/chamados/VF-0001/mensagens").with(autenticado(ana)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensagens[0].texto").value("Guincho a caminho"))
                .andExpect(jsonPath("$.mensagens[0].origem").value("EQUIPE"))
                .andExpect(jsonPath("$.lidoAte").exists());
    }

    @Test
    void enviaArquivoNaConversa() throws Exception {
        UsuarioAtual paula = usuario("ATENDENTE");
        MockMultipartFile foto = new MockMultipartFile("arquivo", "pneu.png", "image/png", new byte[]{1});

        mockMvc.perform(multipart("/api/chamados/VF-0001/mensagens/arquivo")
                        .file(foto)
                        .param("texto", "Segue a foto")
                        .param("visivelCliente", "true")
                        .header("Idempotency-Key", "chave")
                        .with(autenticado(paula)))
                .andExpect(status().isCreated());

        then(atendimento).should().enviarArquivoNaConversa("VF-0001", foto, "Segue a foto", true, "chave", paula);
    }

    @Test
    void marcaComoLida() throws Exception {
        UsuarioAtual ana = usuario("CLIENTE");

        mockMvc.perform(post("/api/chamados/VF-0001/mensagens/leitura")
                        .with(autenticado(ana))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ate\":\"2026-11-04T10:00:00-03:00\"}"))
                .andExpect(status().isNoContent());

        then(conversa).should().marcarComoLida(eq("VF-0001"), argThat(ate -> ate.isEqual(OffsetDateTime.parse("2026-11-04T10:00:00-03:00"))), eq(ana));
    }

    @Test
    void leituraExigeOInstante() throws Exception {
        mockMvc.perform(post("/api/chamados/VF-0001/mensagens/leitura")
                        .with(autenticado(usuario("CLIENTE")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.ate").value("Informe até quando a conversa foi lida."));
    }

    private UsuarioAtual usuario(String perfil) {
        UsuarioAtual usuario = new UsuarioAtual(UUID.randomUUID(), "Usuário " + perfil, Set.of(perfil), Set.of(), null);
        given(identificacao.de(argThat((Jwt token) -> token != null
                && usuario.id().toString().equals(token.getSubject())))).willReturn(usuario);
        return usuario;
    }

    private static RequestPostProcessor autenticado(UsuarioAtual usuario) {
        String perfil = usuario.perfis().iterator().next();
        return jwt()
                .jwt(token -> token.subject(usuario.id().toString()).claim("perfis", List.of(perfil)))
                .authorities(new SimpleGrantedAuthority("ROLE_" + perfil));
    }
}
