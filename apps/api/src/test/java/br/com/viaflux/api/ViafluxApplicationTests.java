package br.com.viaflux.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class ViafluxApplicationTests {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void contextLoads() {
        assertThat(postgres.isRunning()).isTrue();
    }

    @Test
    void connectsToPostgresAndAppliesRequesterLinkMigration() {
        Boolean schemaExists = jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'viaflux')",
                Boolean.class
        );
        Boolean requesterMigrationApplied = jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM public.flyway_schema_history " +
                        "WHERE version = '10' AND success = TRUE)",
                Boolean.class
        );

        assertThat(schemaExists).isTrue();
        assertThat(requesterMigrationApplied).isTrue();
    }

    @Test
    void healthEndpointReturnsUp() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void blocksBusinessPathsWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/chamados"))
                .andExpect(status().isUnauthorized())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void openApiDocumentationIsPublic() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("ViaFlux Mobilidade API"))
                .andExpect(jsonPath("$.info.version").value("v1"));
    }

    @Test
    void rejectsTicketOpeningWithoutAuthentication() throws Exception {
        mockMvc.perform(post("/api/chamados")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cliente\":\"Motorista de teste\",\"modelo\":\"Volvo FH\",\"tipo\":\"Mecânico\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deniesDepartmentProfileUntilDepartmentAssignmentExists() throws Exception {
        mockMvc.perform(get("/api/chamados")
                        .with(jwt().jwt(token -> token.subject(java.util.UUID.randomUUID().toString())
                                        .claim("perfis", java.util.List.of("DEPARTAMENTO")))
                                .authorities(new SimpleGrantedAuthority("ROLE_DEPARTAMENTO"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void customerCanOnlyListAndConsultOwnTickets() throws Exception {
        UUID primeiroCliente = criarClienteDeTeste();
        UUID segundoCliente = criarClienteDeTeste();

        String resposta = mockMvc.perform(post("/api/chamados")
                        .with(tokenCliente(primeiroCliente))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"cliente":"Cliente A","modelo":"Volvo FH","tipo":"Mecânico"}
                                """))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode chamado = objectMapper.readTree(resposta);
        String codigo = chamado.get("id").asText();

        assertThat(jdbcTemplate.queryForObject(
                "SELECT solicitante_id FROM viaflux.chamados WHERE codigo = ?", UUID.class, codigo
        )).isEqualTo(primeiroCliente);

        mockMvc.perform(get("/api/chamados")
                        .with(tokenCliente(primeiroCliente))
                        .queryParam("busca", codigo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));

        mockMvc.perform(get("/api/chamados")
                        .with(tokenCliente(segundoCliente))
                        .queryParam("busca", codigo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));

        mockMvc.perform(get("/api/chamados")
                        .with(tokenPerfil(UUID.randomUUID(), "ADMIN"))
                        .queryParam("busca", codigo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));

        mockMvc.perform(get("/api/chamados/{codigo}", codigo)
                        .with(tokenCliente(segundoCliente)))
                .andExpect(status().isNotFound());
    }

    private UUID criarClienteDeTeste() {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO viaflux.usuario (id, nome, email, senha_hash) VALUES (?, ?, ?, ?)",
                id, "Cliente de teste", id + "@exemplo.com", "hash-de-teste"
        );
        return id;
    }

    private static RequestPostProcessor tokenCliente(UUID usuarioId) {
        return tokenPerfil(usuarioId, "CLIENTE");
    }

    private static RequestPostProcessor tokenPerfil(UUID usuarioId, String perfil) {
        return jwt()
                .jwt(token -> token.subject(usuarioId.toString()).claim("perfis", List.of(perfil)))
                .authorities(new SimpleGrantedAuthority("ROLE_" + perfil));
    }
}
