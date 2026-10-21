package br.com.viaflux.api.devtools;

import br.com.viaflux.api.shared.config.SecurityConfig;
import br.com.viaflux.api.shared.error.ApiExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(value = DevToolsController.class, properties = "viaflux.dev-tools.habilitado=true")
@Import({SecurityConfig.class, ApiExceptionHandler.class})
class DevToolsControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PopuladorDeDados populador;

    @Test
    void exigeAutenticacao() throws Exception {
        mockMvc.perform(post("/api/dev/seed")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ATENDENTE")
    void restringeAoAdministrador() throws Exception {
        mockMvc.perform(post("/api/dev/seed")).andExpect(status().isForbidden());
        then(populador).should(never()).popular(anyInt());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void populaComQuantidadePadraoQuandoOCorpoEstaVazio() throws Exception {
        given(populador.popular(30)).willReturn(new PopuladorDeDados.ResultadoDoSeed(3, 10, 30, List.of("VF-0000")));

        mockMvc.perform(post("/api/dev/seed"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chamadosCriados").value(30))
                .andExpect(jsonPath("$.protocolos[0]").value("VF-0000"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void recusaQuantidadeForaDoLimite() throws Exception {
        mockMvc.perform(post("/api/dev/seed").contentType(MediaType.APPLICATION_JSON).content("{\"quantidadeDeChamados\": 500}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.quantidadeDeChamados").exists());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void explicaQuandoFaltaASenhaDosUsuarios() throws Exception {
        given(populador.popular(30)).willThrow(new DevToolsIndisponivelException("Defina DEV_TOOLS_SENHA em infra/.env"));

        mockMvc.perform(post("/api/dev/seed"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Defina DEV_TOOLS_SENHA em infra/.env"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void informaOEstadoDosDados() throws Exception {
        given(populador.estado()).willReturn(new PopuladorDeDados.EstadoDosDados(12, 10, true, List.of()));

        mockMvc.perform(get("/api/dev/estado"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalDeChamados").value(12))
                .andExpect(jsonPath("$.senhaConfigurada").value(true));
    }
}
