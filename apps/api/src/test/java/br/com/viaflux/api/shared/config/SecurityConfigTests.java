package br.com.viaflux.api.shared.config;

import br.com.viaflux.api.chamado.ChamadoController;
import br.com.viaflux.api.chamado.ServicosDeChamadoSimulados;
import br.com.viaflux.api.usuario.IdentificacaoDoUsuario;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.containsStringIgnoringCase;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ChamadoController.class)
@Import({SecurityConfig.class, ServicosDeChamadoSimulados.class})
class SecurityConfigTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IdentificacaoDoUsuario identificacao;

    @Test
    void deniesUnauthenticatedBusinessRequestsWithProblemDetails() throws Exception {
        mockMvc.perform(get("/api/chamados"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void deniesUnauthenticatedTicketCreation() throws Exception {
        mockMvc.perform(post("/api/chamados")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void forbidsOperationalLeaderFromCreatingTicket() throws Exception {
        mockMvc.perform(post("/api/chamados")
                        .with(perfil("LIDER_OPERACIONAL"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void deniesUnauthenticatedDashboardSummary() throws Exception {
        mockMvc.perform(get("/api/chamados/resumo"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void forbidsClientFromDashboardSummary() throws Exception {
        mockMvc.perform(get("/api/chamados/resumo").with(perfil("CLIENTE")))
                .andExpect(status().isForbidden());
    }

    @Test
    void letsDepartmentReachTheTicketQueue() throws Exception {
        mockMvc.perform(get("/api/chamados").with(perfil("DEPARTAMENTO")))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/chamados/resumo").with(perfil("DEPARTAMENTO")))
                .andExpect(status().isOk());
    }

    @Test
    void letsAdminReachTheTicketQueueAndSummary() throws Exception {
        mockMvc.perform(get("/api/chamados").with(perfil("ADMIN")))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/chamados/resumo").with(perfil("ADMIN")))
                .andExpect(status().isOk());
    }

    @Test
    void forbidsSupplierFromTicketEndpoints() throws Exception {
        mockMvc.perform(get("/api/chamados/VF-0001").with(perfil("FORNECEDOR")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/chamados").with(perfil("FORNECEDOR")))
                .andExpect(status().isForbidden());
    }

    @Test
    void forbidsClientFromChangingTicketStatus() throws Exception {
        mockMvc.perform(patch("/api/chamados/VF-0001/status")
                        .with(perfil("CLIENTE"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"Resolvido\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void acceptsCorsPreflightFromConfiguredOrigin() throws Exception {
        mockMvc.perform(options("/api/chamados")
                        .header(HttpHeaders.ORIGIN, "http://localhost:3000")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:3000"));
    }

    @Test
    void allowsIdempotencyKeyHeaderInCorsPreflight() throws Exception {
        mockMvc.perform(options("/api/chamados")
                        .header(HttpHeaders.ORIGIN, "http://localhost:3000")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization, Content-Type, Idempotency-Key"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS,
                        containsStringIgnoringCase("Idempotency-Key")));
    }

    @Test
    void exposesContentDispositionToTheBrowser() throws Exception {
        mockMvc.perform(get("/api/chamados")
                        .with(perfil("ATENDENTE"))
                        .header(HttpHeaders.ORIGIN, "http://localhost:3000"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS,
                        containsString("Content-Disposition")));
    }

    @Test
    void rejectsCorsPreflightFromUnconfiguredOrigin() throws Exception {
        mockMvc.perform(options("/api/chamados")
                        .header(HttpHeaders.ORIGIN, "https://origem-nao-confiavel.example")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isForbidden());
    }

    private static RequestPostProcessor perfil(String perfil) {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_" + perfil));
    }
}
