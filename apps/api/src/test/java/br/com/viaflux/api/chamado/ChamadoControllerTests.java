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
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
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
    void rejectsTicketOpeningWithoutAuthentication() throws Exception {
        mockMvc.perform(post("/api/chamados")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cliente\":\"Maria Silva\",\"modelo\":\"Volvo FH 460\",\"tipo\":\"Mecânico\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void opensTicketForAuthenticatedClient() throws Exception {
        String id = "VF-0000";
        UUID solicitanteId = UUID.randomUUID();
        OffsetDateTime abertoEm = OffsetDateTime.of(2026, 10, 8, 16, 0, 0, 0, ZoneOffset.UTC);
        given(chamadoService.abrir(any(AbrirChamadoRequest.class), eq(solicitanteId)))
                .willReturn(new ChamadoResponse(id, "Maria Silva", "(11) 99999-0000", "Volvo FH 460",
                        "ABC-1D23", "Mecânico", "Média", "Motor não liga", "BR-116, km 312", "Aberto", abertoEm,
                        List.of(new TimelineItemResponse("09:00", "Chamado aberto",
                                "Chamado registrado pelo portal ViaFlux.", "aberto", abertoEm))));

        mockMvc.perform(post("/api/chamados")
                        .with(autenticado(solicitanteId, "CLIENTE"))
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
    void associatesAuthenticatedRequesterFromJwtSubject() throws Exception {
        UUID solicitanteId = UUID.randomUUID();
        given(chamadoService.abrir(any(AbrirChamadoRequest.class), eq(solicitanteId)))
                .willReturn(new ChamadoResponse("VF-0001", "Maria Silva", "", "Volvo FH 460",
                        "", "Mecânico", "Média", "", "", "Aberto",
                        OffsetDateTime.of(2026, 10, 8, 16, 0, 0, 0, ZoneOffset.UTC), List.of()));

        mockMvc.perform(post("/api/chamados")
                        .with(autenticado(solicitanteId, "CLIENTE"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"cliente":"Maria Silva","modelo":"Volvo FH 460","tipo":"Mecânico"}
                                """))
                .andExpect(status().isCreated());
    }

    @Test
    void rejectsTicketWithoutRequiredCustomerVehicleAndType() throws Exception {
        mockMvc.perform(post("/api/chamados").with(autenticado(UUID.randomUUID(), "CLIENTE"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cliente\":\"\",\"modelo\":\"\",\"tipo\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.cliente").value("O nome do cliente é obrigatório."))
                .andExpect(jsonPath("$.errors.modelo").value("O modelo do veículo é obrigatório."))
                .andExpect(jsonPath("$.errors.tipo").value("O tipo do problema é obrigatório."));
    }

    @Test
    void retrievesTicketForAuthenticatedOwner() throws Exception {
        String id = "VF-0000";
        UUID solicitanteId = UUID.randomUUID();
        OffsetDateTime abertoEm = OffsetDateTime.of(2026, 10, 8, 16, 0, 0, 0, ZoneOffset.UTC);
        given(chamadoService.consultar(id, solicitanteId, false))
                .willReturn(new ChamadoResponse(id, "Maria Silva", "", "Volvo FH 460",
                        "", "Mecânico", "Média", "", "", "Aberto", abertoEm, List.of()));

        mockMvc.perform(get("/api/chamados/{id}", id).with(autenticado(solicitanteId, "CLIENTE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.cliente").value("Maria Silva"))
                .andExpect(jsonPath("$.status").value("Aberto"));
    }

    @Test
    void listsTicketsWithFiltersAndPaginationForAuthenticatedClient() throws Exception {
        UUID solicitanteId = UUID.randomUUID();
        OffsetDateTime abertura = OffsetDateTime.of(2026, 10, 13, 12, 0, 0, 0, ZoneOffset.UTC);
        given(chamadoService.listar("Volvo", "Aberto", "Média", 0, 10, solicitanteId, false))
                .willReturn(new ChamadosPageResponse(
                        List.of(new ChamadoListaItemResponse("VF-0000", "Maria Silva", "Volvo FH 460",
                                "ABC-1D23", "Mecânico", "BR-116", "Aberto", "Média", abertura)),
                        0, 10, 1, 1
                ));

        mockMvc.perform(get("/api/chamados")
                        .with(autenticado(solicitanteId, "CLIENTE"))
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
    void returnsDashboardSummaryToAdmin() throws Exception {
        given(chamadoService.resumir()).willReturn(new ChamadosResumoResponse(12, 2, 5, 3));

        mockMvc.perform(get("/api/chamados/resumo").with(autenticado(UUID.randomUUID(), "ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(12))
                .andExpect(jsonPath("$.criticos").value(2))
                .andExpect(jsonPath("$.emAtendimento").value(5))
                .andExpect(jsonPath("$.aguardando").value(3));
    }

    @Test
    void listsAllTicketsForAttendant() throws Exception {
        UUID atendenteId = UUID.randomUUID();
        given(chamadoService.listar(null, null, null, 0, 20, atendenteId, true))
                .willReturn(new ChamadosPageResponse(List.of(), 0, 20, 0, 0));

        mockMvc.perform(get("/api/chamados").with(autenticado(atendenteId, "ATENDENTE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void rejectsPageSizesOverOneHundred() throws Exception {
        mockMvc.perform(get("/api/chamados")
                        .with(autenticado(UUID.randomUUID(), "CLIENTE"))
                        .queryParam("size", "101"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsUnknownStatusFilter() throws Exception {
        UUID solicitanteId = UUID.randomUUID();
        given(chamadoService.listar(null, "Inválido", null, 0, 20, solicitanteId, false))
                .willThrow(new FiltroChamadoInvalidoException("O status informado não é válido."));

        mockMvc.perform(get("/api/chamados")
                        .with(autenticado(solicitanteId, "CLIENTE"))
                        .queryParam("status", "Inválido"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("O status informado não é válido."));
    }

    @Test
    void returnsNotFoundWhenTicketDoesNotExist() throws Exception {
        String id = "VF-999999";
        UUID adminId = UUID.randomUUID();
        given(chamadoService.consultar(id, adminId, true)).willThrow(new ChamadoNaoEncontradoException(id));

        mockMvc.perform(get("/api/chamados/{id}", id).with(autenticado(adminId, "ADMIN")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Chamado não encontrado."));
    }

    @Test
    void treatsUnknownPublicCodeAsNotFound() throws Exception {
        UUID adminId = UUID.randomUUID();
        given(chamadoService.consultar("identificador-invalido", adminId, true))
                .willThrow(new ChamadoNaoEncontradoException("identificador-invalido"));

        mockMvc.perform(get("/api/chamados/identificador-invalido").with(autenticado(adminId, "ADMIN")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Chamado não encontrado."));
    }

    private static RequestPostProcessor autenticado(UUID usuarioId, String perfil) {
        return jwt()
                .jwt(token -> token.subject(usuarioId.toString()).claim("perfis", List.of(perfil)))
                .authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + perfil));
    }
}
