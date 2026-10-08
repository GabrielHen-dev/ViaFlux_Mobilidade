package br.com.viaflux.api.chamado;

import br.com.viaflux.api.shared.config.SecurityConfig;
import br.com.viaflux.api.shared.error.ApiExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ChamadoController.class)
@Import({SecurityConfig.class, ApiExceptionHandler.class})
class ChamadoControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ChamadoService chamadoService;

    @Test
    void opensTicketWithoutAuthentication() throws Exception {
        UUID id = UUID.randomUUID();
        OffsetDateTime abertoEm = OffsetDateTime.of(2026, 10, 8, 16, 0, 0, 0, ZoneOffset.UTC);
        given(chamadoService.abrir(any(AbrirChamadoRequest.class)))
                .willReturn(new ChamadoResponse(id, "Maria Silva", StatusChamado.ABERTO, abertoEm));

        mockMvc.perform(post("/api/chamados")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"solicitante\":\"Maria Silva\"}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "http://localhost/api/chamados/" + id))
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.solicitante").value("Maria Silva"))
                .andExpect(jsonPath("$.status").value("ABERTO"));
    }

    @Test
    void rejectsTicketWithoutRequester() throws Exception {
        mockMvc.perform(post("/api/chamados")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"solicitante\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.solicitante").value("O solicitante é obrigatório."));
    }

    @Test
    void retrievesTicketWithoutAuthentication() throws Exception {
        UUID id = UUID.randomUUID();
        OffsetDateTime abertoEm = OffsetDateTime.of(2026, 10, 8, 16, 0, 0, 0, ZoneOffset.UTC);
        given(chamadoService.consultar(id))
                .willReturn(new ChamadoResponse(id, "Maria Silva", StatusChamado.ABERTO, abertoEm));

        mockMvc.perform(get("/api/chamados/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.solicitante").value("Maria Silva"))
                .andExpect(jsonPath("$.status").value("ABERTO"));
    }

    @Test
    void returnsNotFoundWhenTicketDoesNotExist() throws Exception {
        UUID id = UUID.randomUUID();
        given(chamadoService.consultar(id)).willThrow(new ChamadoNaoEncontradoException(id));

        mockMvc.perform(get("/api/chamados/{id}", id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Chamado não encontrado."));
    }

    @Test
    void rejectsInvalidTicketIdentifier() throws Exception {
        mockMvc.perform(get("/api/chamados/identificador-invalido"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Um ou mais parâmetros são inválidos."));
    }
}
