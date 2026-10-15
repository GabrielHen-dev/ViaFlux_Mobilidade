package br.com.viaflux.api.shared.config;

import br.com.viaflux.api.chamado.ChamadoController;
import br.com.viaflux.api.chamado.ChamadoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ChamadoController.class)
@Import(SecurityConfig.class)
class SecurityConfigTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ChamadoService chamadoService;

    @Test
    void deniesUnauthenticatedBusinessRequestsWithProblemDetails() throws Exception {
        mockMvc.perform(get("/api/chamados"))
                .andExpect(status().isUnauthorized())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void deniesUnauthenticatedTicketCreation() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/chamados")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void forbidsAdministrativeProfileFromCreatingCustomerTicket() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/chamados")
                        .with(perfil("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
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
    void forbidsDepartmentFromTicketsUntilDepartmentAssignmentExists() throws Exception {
        mockMvc.perform(get("/api/chamados").with(perfil("DEPARTAMENTO")))
                .andExpect(status().isForbidden());
    }

    @Test
    void forbidsSupplierFromTicketEndpointsUntilServiceAssociationExists() throws Exception {
        mockMvc.perform(get("/api/chamados/VF-0001").with(perfil("FORNECEDOR")))
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
