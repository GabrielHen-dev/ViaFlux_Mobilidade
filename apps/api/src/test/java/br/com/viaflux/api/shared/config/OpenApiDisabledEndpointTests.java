package br.com.viaflux.api.shared.config;

import br.com.viaflux.api.chamado.RepositoriosDeChamadoSimulados;
import br.com.viaflux.api.conta.RepositorioDeTokensSimulado;
import br.com.viaflux.api.notificacao.RepositorioDeNotificacoesSimulado;
import br.com.viaflux.api.usuario.DepartamentoRepository;
import br.com.viaflux.api.usuario.OrganizacaoRepository;
import br.com.viaflux.api.usuario.PerfilRepository;
import br.com.viaflux.api.usuario.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "springdoc.api-docs.enabled=false",
        "springdoc.swagger-ui.enabled=false",
        "spring.autoconfigure.exclude="
                + "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration"
})
@AutoConfigureMockMvc
@Import({RepositoriosDeChamadoSimulados.class, RepositorioDeNotificacoesSimulado.class, RepositorioDeTokensSimulado.class})
class OpenApiDisabledEndpointTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioRepository usuarioRepository;

    @MockitoBean
    private PerfilRepository perfilRepository;

    @MockitoBean
    private OrganizacaoRepository organizacaoRepository;

    @MockitoBean
    private DepartamentoRepository departamentoRepository;

    @Test
    void doesNotExposeDocumentationWhenDisabled() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isNotFound());
    }
}
