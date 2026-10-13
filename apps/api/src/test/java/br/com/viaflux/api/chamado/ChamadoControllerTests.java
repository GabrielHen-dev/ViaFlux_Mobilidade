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
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
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
        String id = "VF-0000";
        OffsetDateTime abertoEm = OffsetDateTime.of(2026, 10, 8, 16, 0, 0, 0, ZoneOffset.UTC);
        given(chamadoService.abrir(any(AbrirChamadoRequest.class)))
                .willReturn(new ChamadoResponse(id, "Maria Silva", "(11) 99999-0000", "Volvo FH 460",
                        "ABC-1D23", "Mecânico", "Média", "Motor não liga", "BR-116, km 312", "Aberto", abertoEm,
                        List.of(new TimelineItemResponse("09:00", "Chamado aberto",
                                "Chamado registrado pelo portal ViaFlux.", "aberto", abertoEm))));

        mockMvc.perform(post("/api/chamados")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "cliente":"Maria Silva",
                                  "telefone":"(11) 99999-0000",
                                  "modelo":"Volvo FH 460",
                                  "placa":"abc-1d23",
                                  "tipo":"Mecânico",
                                  "descricao":"Motor não liga",
                                  "localizacao":"BR-116, km 312"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "http://localhost/api/chamados/" + id))
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.cliente").value("Maria Silva"))
                .andExpect(jsonPath("$.modelo").value("Volvo FH 460"))
                .andExpect(jsonPath("$.placa").value("ABC-1D23"))
                .andExpect(jsonPath("$.prioridade").value("Média"))
                .andExpect(jsonPath("$.status").value("Aberto"))
                .andExpect(jsonPath("$.timeline[0].acao").value("Chamado aberto"))
                .andExpect(jsonPath("$.timeline[0].icon").value("aberto"));
    }

    @Test
    void rejectsTicketWithoutRequiredCustomerVehicleAndType() throws Exception {
        mockMvc.perform(post("/api/chamados")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cliente\":\"\",\"modelo\":\"\",\"tipo\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.cliente").value("O nome do cliente é obrigatório."))
                .andExpect(jsonPath("$.errors.modelo").value("O modelo do veículo é obrigatório."))
                .andExpect(jsonPath("$.errors.tipo").value("O tipo do problema é obrigatório."));
    }

    @Test
    void retrievesTicketWithoutAuthentication() throws Exception {
        String id = "VF-0000";
        OffsetDateTime abertoEm = OffsetDateTime.of(2026, 10, 8, 16, 0, 0, 0, ZoneOffset.UTC);
        given(chamadoService.consultar(id))
                .willReturn(new ChamadoResponse(id, "Maria Silva", "", "Volvo FH 460",
                        "", "Mecânico", "Média", "", "", "Aberto", abertoEm, List.of()));

        mockMvc.perform(get("/api/chamados/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.cliente").value("Maria Silva"))
                .andExpect(jsonPath("$.status").value("Aberto"));
    }

    @Test
    void listsTicketsWithFiltersAndPaginationWithoutAuthentication() throws Exception {
        OffsetDateTime abertura = OffsetDateTime.of(2026, 10, 13, 12, 0, 0, 0, ZoneOffset.UTC);
        given(chamadoService.listar("Volvo", "Aberto", "Média", 0, 10))
                .willReturn(new ChamadosPageResponse(
                        List.of(new ChamadoListaItemResponse("VF-0000", "Maria Silva", "Volvo FH 460",
                                "ABC-1D23", "Mecânico", "BR-116", "Aberto", "Média", abertura)),
                        0, 10, 1, 1
                ));

        mockMvc.perform(get("/api/chamados")
                        .queryParam("busca", "Volvo")
                        .queryParam("status", "Aberto")
                        .queryParam("prioridade", "Média")
                        .queryParam("page", "0")
                        .queryParam("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value("VF-0000"))
                .andExpect(jsonPath("$.content[0].cliente").value("Maria Silva"))
                .andExpect(jsonPath("$.content[0].status").value("Aberto"))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.totalPages").value(1));
    }

    @Test
    void rejectsPageSizesOverOneHundred() throws Exception {
        mockMvc.perform(get("/api/chamados").queryParam("size", "101"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsUnknownStatusFilter() throws Exception {
        given(chamadoService.listar(null, "Inválido", null, 0, 20))
                .willThrow(new FiltroChamadoInvalidoException("O status informado não é válido."));

        mockMvc.perform(get("/api/chamados").queryParam("status", "Inválido"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("O status informado não é válido."));
    }

    @Test
    void returnsNotFoundWhenTicketDoesNotExist() throws Exception {
        String id = "VF-999999";
        given(chamadoService.consultar(id)).willThrow(new ChamadoNaoEncontradoException(id));

        mockMvc.perform(get("/api/chamados/{id}", id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Chamado não encontrado."));
    }

    @Test
    void treatsUnknownPublicCodeAsNotFound() throws Exception {
        given(chamadoService.consultar("identificador-invalido"))
                .willThrow(new ChamadoNaoEncontradoException("identificador-invalido"));

        mockMvc.perform(get("/api/chamados/identificador-invalido"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Chamado não encontrado."));
    }
}
